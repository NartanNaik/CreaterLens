import { db, FieldValue } from "../config/firebase.js";
import * as bloomFilterService from "../services/bloomFilterService.js";
import * as scraperService from "../services/scraperService.js";
import * as aiService from "../services/aiService.js";
import * as profileService from "../services/profileService.js";
import { decryptKey } from "../services/encryptionService.js";

const stagingCollection = db.collection("staging");
const profilesCollection = db.collection("profiles");
const usersCollection = db.collection("users");

// ---------- constants ----------
const HANDLE_REGEX = /^[A-Za-z0-9._]{1,30}$/;
const MAX_SHARE_URLS = 25;
const MAX_BULK_IMPORT_ITEMS = 100;
const MAX_BULK_IDS = 1000;
const APPROVE_CHUNK = 200;   // 2 writes per item => 400 ops, under Firestore's 500-op batch limit
const DELETE_CHUNK = 400;
const DEFAULT_QUEUE_LIMIT = 1000;
const MAX_QUEUE_LIMIT = 2000;
const MAX_CAPTION_LENGTH = 2000;

// Server-side fetches (thumbnails -> AI) are only allowed against Instagram's own CDNs.
const MEDIA_HOST_REGEX = /(^|\.)(cdninstagram\.com|fbcdn\.net|instagram\.com)$/i;

// Account types that get auto-rejected.
const REJECT_ACCOUNT_REGEX = /\b(male|man|brand|business|company)\b/i;

// ---------- helpers ----------
const cleanHandle = (raw) => {
  if (typeof raw !== "string") return "";
  const handle = raw.trim().replace(/^@+/, "").trim();
  return HANDLE_REGEX.test(handle) ? handle : "";
};

const isValidDocId = (id) =>
  typeof id === "string" && id.length > 0 && id.length <= 200 && !id.includes("/") && id !== "." && id !== "..";

const uniqueValidIds = (ids) => [...new Set((Array.isArray(ids) ? ids : []).filter(isValidDocId))];

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const toCount = (value) => Math.max(0, parseInt(value, 10) || 0);

// AI returns "-" for unknown attributes; store real empties on the approved profile
const cleanAttr = (value) => (typeof value === "string" && value.trim() && value.trim() !== "-" ? value.trim() : "");

const safeMediaUrl = (url) => {
  if (typeof url !== "string" || !url.trim()) return "";
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:") return "";
    return MEDIA_HOST_REGEX.test(parsed.hostname) ? parsed.toString() : "";
  } catch {
    return "";
  }
};

const isRateLimitError = (err) =>
  err?.response?.status === 429 ||
  err?.status === 429 ||
  err?.code === 429 ||
  /\b429\b|rate.?limit|quota|too many requests/i.test(err?.message || "");

const parseReelInput = (input) => {
  if (!input || typeof input !== "string") return [];
  const urlRegex = /(https?:\/\/(?:www\.)?instagram\.com\/(?:reel|reels|p)\/[a-zA-Z0-9_-]+)/gi;
  const matches = input.match(urlRegex) || [];
  return [...new Set(matches.map((url) => {
    try {
      const parsed = new URL(url);
      return `${parsed.origin}${parsed.pathname}`;
    } catch {
      return url.split("?")[0];
    }
  }))];
};

const shortcodeOf = (url) => {
  const match = /instagram\.com\/(?:reel|reels|p)\/([A-Za-z0-9_-]+)/i.exec(url || "");
  return match ? match[1] : "";
};

const markFailed = async (id, userId) => {
  try {
    const docRef = stagingCollection.doc(id);
    const snap = await docRef.get();
    if (snap.exists && snap.data().userId === userId) {
      await docRef.update({ status: "failed" });
    }
  } catch {
    // The doc may have been deleted meanwhile; nothing to mark.
  }
};

// Builds the approved-profile document from a staging document scoped to the user
const buildProfileFromStaging = (item, userId) => {
  const username = (typeof item.username === "string" && item.username.trim()) || "Unknown";

  return {
    userId,
    username,
    normalizedUsername: username.toLowerCase(),
    contact: item.contact || "",
    nation: cleanAttr(item.nation),
    skinTone: cleanAttr(item.skinTone),
    bodyType: cleanAttr(item.bodyType),
    reelType: cleanAttr(item.reelType),
    specialPart: cleanAttr(item.specialPart),
    ageRange: cleanAttr(item.ageRange),
    totalFollowers: toCount(item.totalFollowers),
    avgViewsPerWeek: toCount(item.avgViewsPerWeek),
    avgLikes: toCount(item.avgLikes),
    avgComments: toCount(item.avgComments),
    playable: false,
    sourceUrl: item.url || "",
    videoPreviewUrl: item.videoPreviewUrl || item.tempScrapeData?.videoUrl || "",
    thumbnailUrl: item.thumbnailUrl || item.tempScrapeData?.thumbnailUrl || "",
    createdAt: new Date().toISOString()
  };
};

// Shared by share + bulk import. Scoped to each user.
const stageReel = async ({ reelUrl, handle, thumbnailUrl = "", caption = "", userId }) => {
  const normalizedHandle = handle.toLowerCase().trim();
  const isUnknown = normalizedHandle === "unknown";

  if (!isUnknown && bloomFilterService.has(`${userId}_${normalizedHandle}`)) {
    const exists = await profileService.checkProfileExists(normalizedHandle, userId);
    if (exists) return { skipped: true, username: normalizedHandle, reason: "Creator already in your database" };
  }

  const stagingCheck = await stagingCollection
    .where("userId", "==", userId)
    .where("url", "==", reelUrl)
    .get();

  if (stagingCheck.docs.some((d) => (d.data().username || "").toLowerCase() === normalizedHandle)) {
    return { skipped: true, username: normalizedHandle, reason: "Already pending in your staging queue" };
  }

  const profileUrlCheck = await profilesCollection
    .where("userId", "==", userId)
    .where("sourceUrl", "==", reelUrl)
    .get();

  if (profileUrlCheck.docs.some((d) => (d.data().username || "").toLowerCase() === normalizedHandle)) {
    return { skipped: true, username: normalizedHandle, reason: "Creator from this reel already exists in your approved profiles" };
  }

  const stagingDoc = {
    userId,
    url: reelUrl,
    username: handle,
    normalizedUsername: normalizedHandle,
    contact: "",
    thumbnailUrl: safeMediaUrl(thumbnailUrl),
    caption: typeof caption === "string" ? caption.slice(0, MAX_CAPTION_LENGTH) : "",
    status: "pending",
    createdAt: new Date().toISOString()
  };

  const shortcode = shortcodeOf(reelUrl);

  if (shortcode) {
    const cleanUserKey = userId.replace(/[^a-zA-Z0-9_-]/g, "");
    const docId = `${cleanUserKey}_${shortcode}_${normalizedHandle.replace(/[^a-z0-9._-]/g, "_")}`;
    try {
      await stagingCollection.doc(docId).create(stagingDoc);
      return { added: { id: docId, ...stagingDoc } };
    } catch (err) {
      if (err?.code === 6 || /already exists/i.test(err?.message || "")) {
        return { skipped: true, username: normalizedHandle, reason: "Already pending in your staging queue" };
      }
      throw err;
    }
  }

  const docRef = await stagingCollection.add(stagingDoc);
  return { added: { id: docRef.id, ...stagingDoc } };
};

// ---------- controllers ----------
export const shareReelController = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized user." });
    }

    const { url, text, title } = req.body || {};
    const rawContent = `${url || ""} ${text || ""} ${title || ""}`.trim();

    if (!rawContent) {
      return res.status(400).json({ success: false, error: "No share payload or URL provided." });
    }

    const allReelUrls = parseReelInput(rawContent);

    if (allReelUrls.length === 0) {
      return res.status(400).json({ success: false, error: "No valid Instagram reel links found in the submission." });
    }

    const reelUrls = allReelUrls.slice(0, MAX_SHARE_URLS);

    const added = [];
    const skipped = [];

    for (const reelUrl of reelUrls) {
      let parsedMeta = {};
      try {
        parsedMeta = (await scraperService.extractBasicInfo(reelUrl)) || {};
      } catch (err) {
        console.error(`extractBasicInfo failed for ${reelUrl}:`, err?.message || err);
        skipped.push({ url: reelUrl, username: "unknown", reason: "Could not read reel info" });
        continue;
      }

      const handles = (parsedMeta.usernames || []).map(cleanHandle).filter(Boolean);
      const handlesToProcess = handles.length > 0 ? handles : ["Unknown"];

      for (const handle of handlesToProcess) {
        try {
          const result = await stageReel({
            reelUrl,
            handle,
            thumbnailUrl: parsedMeta.thumbnailUrl,
            caption: parsedMeta.caption,
            userId
          });

          if (result.added) added.push(result.added);
          else skipped.push({ url: reelUrl, username: result.username, reason: result.reason });
        } catch (err) {
          console.error(`Failed staging ${reelUrl} / ${handle}:`, err?.stack || err);
          skipped.push({ url: reelUrl, username: handle.toLowerCase(), reason: "Could not save to staging" });
        }
      }
    }

    const truncated = allReelUrls.length - reelUrls.length;

    return res.status(200).json({
      success: true,
      message: `Processed ${reelUrls.length} links. Added: ${added.length}, Skipped: ${skipped.length}` +
        (truncated > 0 ? `. ${truncated} extra link(s) ignored (max ${MAX_SHARE_URLS} per request).` : ""),
      addedCount: added.length,
      skippedCount: skipped.length,
      added,
      skipped
    });
  } catch (error) {
    console.error("Error handling share target:", error?.stack || error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
};

export const bulkImportStagingItemsController = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized user." });
    }

    const { items } = req.body || {};

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: "No valid items provided for bulk import." });
    }

    if (items.length > MAX_BULK_IMPORT_ITEMS) {
      return res.status(413).json({
        success: false,
        error: `Too many items. Send at most ${MAX_BULK_IMPORT_ITEMS} per request.`
      });
    }

    const added = [];
    const skipped = [];

    for (const item of items) {
      if (!item || typeof item !== "object") {
        skipped.push({ url: "", username: "", reason: "Invalid item" });
        continue;
      }

      const reelUrl = parseReelInput(typeof item.url === "string" ? item.url : "")[0];
      if (!reelUrl) {
        skipped.push({ url: String(item.url || ""), username: "", reason: "Invalid reel URL" });
        continue;
      }

      const rawHandle = typeof item.username === "string" ? item.username.trim() : "";
      let handle = "Unknown";
      if (rawHandle) {
        handle = cleanHandle(rawHandle);
        if (!handle) {
          skipped.push({ url: reelUrl, username: rawHandle.toLowerCase().slice(0, 40), reason: "Invalid username" });
          continue;
        }
      }

      try {
        const result = await stageReel({
          reelUrl,
          handle,
          thumbnailUrl: item.thumbnailUrl,
          caption: item.caption,
          userId
        });

        if (result.added) added.push(result.added);
        else skipped.push({ url: reelUrl, username: result.username, reason: result.reason });
      } catch (err) {
        console.error(`Bulk import failed for ${reelUrl}:`, err?.stack || err);
        skipped.push({ url: reelUrl, username: handle.toLowerCase(), reason: "Could not save to staging" });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Processed ${items.length} links. Added: ${added.length}, Skipped: ${skipped.length}`,
      addedCount: added.length,
      skippedCount: skipped.length,
      added,
      skipped
    });
  } catch (error) {
    console.error("Error in bulk import:", error?.stack || error);
    return res.status(500).json({ success: false, error: "Internal server error during bulk import." });
  }
};

export const getStagingQueueController = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized user." });
    }

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");

    const requested = parseInt(req.query.limit, 10);
    const limit = Math.min(Number.isFinite(requested) && requested > 0 ? requested : DEFAULT_QUEUE_LIMIT, MAX_QUEUE_LIMIT);

    // Strictly multi-tenant: filter by logged-in userId
    const snapshot = await stagingCollection
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const items = snapshot.docs.map((doc) => {
      const data = doc.data();
      for (const [key, value] of Object.entries(data)) {
        if (value && typeof value.toDate === "function") data[key] = value.toDate().toISOString();
      }
      return { ...data, id: doc.id };
    });

    return res.status(200).json({ success: true, count: items.length, data: items });
  } catch (error) {
    console.error("Error fetching staging queue:", error?.stack || error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
};

export const processStagingItemController = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized user." });
    }

    const { step } = req.query;
    const body = req.body || {};

    if (!isValidDocId(id)) {
      return res.status(400).json({ success: false, error: "A valid staging item ID is required." });
    }

    if (step !== "scrape" && step !== "analyze") {
      return res.status(400).json({ success: false, error: "Missing valid ?step query parameter (scrape or analyze)." });
    }

    let customUsername = "";
    if (body.username !== undefined && body.username !== null && body.username !== "") {
      customUsername = cleanHandle(body.username);
      if (!customUsername) {
        return res.status(400).json({ success: false, error: "Invalid username." });
      }
    }

    const docRef = stagingCollection.doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists || docSnap.data().userId !== userId) {
      return res.status(200).json({
        success: true,
        deleted: true,
        alreadyProcessed: true,
        message: "Item already approved, filtered, or removed."
      });
    }

    const itemData = docSnap.data();

    if (customUsername && customUsername !== itemData.username) {
      itemData.username = customUsername;
      await docRef.update({ username: customUsername, normalizedUsername: customUsername.toLowerCase() });
    }

    // ---------- STEP 1: scrape ----------
    if (step === "scrape") {
      let richMedia;
      try {
        richMedia = (await scraperService.fetchFullReelMedia(itemData.url, itemData.username)) || {};
      } catch (scrapeError) {
        if (isRateLimitError(scrapeError)) {
          return res.status(429).json({ success: false, error: "Scraper is rate limited. Retrying shortly." });
        }
        throw scrapeError;
      }

      await docRef.update({
        tempScrapeData: {
          videoUrl: safeMediaUrl(richMedia.videoUrl),
          thumbnailUrl: safeMediaUrl(richMedia.thumbnailUrl) || safeMediaUrl(itemData.thumbnailUrl),
          caption: (richMedia.caption || itemData.caption || "").slice(0, MAX_CAPTION_LENGTH),
          username: cleanHandle(richMedia.username) || itemData.username || ""
        },
        status: "scraping_done"
      });

      return res.status(200).json({ success: true, message: "Scrape complete, ready for AI." });
    }

    // ---------- STEP 2: analyze (using decrypted personal sub-key) ----------
    const targetData = itemData.tempScrapeData || {
      videoUrl: itemData.videoPreviewUrl || "",
      thumbnailUrl: itemData.thumbnailUrl,
      caption: itemData.caption,
      username: itemData.username
    };

    const thumbnailUrl = safeMediaUrl(targetData.thumbnailUrl);
    const videoUrl = safeMediaUrl(targetData.videoUrl);

    // Retrieve and decrypt the user's personal $0 sub-key
    let userApiKey = null;
    try {
      const userDoc = await usersCollection.doc(userId).get();
      if (userDoc.exists && userDoc.data().encryptedOrKey) {
        userApiKey = decryptKey(userDoc.data().encryptedOrKey);
      }
    } catch (keyErr) {
      console.error("Failed to decrypt user OpenRouter key:", keyErr?.message || keyErr);
    }

    let aiResult = null;

    try {
      aiResult = await aiService.analyzeReelMedia(
        {
          videoUrl,
          thumbnailUrl,
          caption: targetData.caption,
          username: targetData.username
        },
        { userApiKey } // Forwarded to AI service to route through user's key
      );

      if (!aiResult || typeof aiResult !== "object") {
        throw new Error("Invalid AI Response format returned");
      }
    } catch (aiError) {
      console.error(`[AI Fallback] Failed for ${targetData.username}. Reason: ${aiError.message}`);

      if (isRateLimitError(aiError)) {
        return res.status(429).json({ success: false, error: "AI providers are rate limited. Retrying shortly." });
      }

      await markFailed(id, userId);
      return res.status(502).json({ success: false, error: "AI analysis failed.", status: "failed" });
    }

    const accountType = String(aiResult.accountType?.value || "").toLowerCase().trim();

    if (REJECT_ACCOUNT_REGEX.test(accountType)) {
      console.log(`[Auto-Filter] Automatically rejected ${targetData.username} (Classified as: ${accountType})`);
      await docRef.delete();
      return res.status(200).json({
        success: true,
        message: "Auto-deleted: Male or Brand detected",
        deleted: true
      });
    }

    const resolvedUsername = cleanHandle(targetData.username) || itemData.username || "";

    const updates = {
      username: resolvedUsername,
      normalizedUsername: resolvedUsername.toLowerCase(),
      nation: aiResult.nation?.value || "-",
      skinTone: aiResult.skinTone?.value || "-",
      bodyType: aiResult.bodyType?.value || "-",
      reelType: aiResult.reelType?.value || "-",
      specialPart: aiResult.specialPart?.value || "-",
      ageRange: aiResult.ageRange?.value || "-",
      totalFollowers: toCount(aiResult.totalFollowers),
      avgViewsPerWeek: toCount(aiResult.avgViewsPerWeek),
      avgLikes: toCount(aiResult.avgLikes),
      avgComments: toCount(aiResult.avgComments),
      videoPreviewUrl: videoUrl,
      thumbnailUrl,
      status: "analyzed"
    };

    await docRef.update({ ...updates, tempScrapeData: FieldValue.delete() });

    return res.status(200).json({
      success: true,
      data: {
        stagingId: id,
        reelUrl: itemData.url,
        ...updates
      }
    });
  } catch (error) {
    console.error("CRITICAL Backend Error analyzing staging reel:", error?.stack || error);
    if (isValidDocId(id)) await markFailed(id, userId);
    return res.status(500).json({ success: false, error: "Failed to process reel." });
  }
};

export const approveStagingItemController = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized user." });
    }

    if (!isValidDocId(id)) {
      return res.status(400).json({ success: false, error: "A valid staging item ID is required." });
    }

    const docRef = stagingCollection.doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists || docSnap.data().userId !== userId) {
      return res.status(200).json({
        success: true,
        deleted: true,
        alreadyProcessed: true,
        message: "Item already approved or moved."
      });
    }

    const newProfile = buildProfileFromStaging(docSnap.data(), userId);
    const normalized = newProfile.normalizedUsername;

    // Check duplicate strictly for this specific user
    if (normalized !== "unknown" && (await profileService.checkProfileExists(normalized, userId))) {
      await docRef.delete();
      return res.status(200).json({
        success: true,
        deleted: true,
        duplicate: true,
        message: "Creator already exists in your database; staging item removed."
      });
    }

    const outcome = await db.runTransaction(async (t) => {
      const fresh = await t.get(docRef);
      if (!fresh.exists) return "gone";

      t.set(profilesCollection.doc(), newProfile);
      t.delete(docRef);
      return "approved";
    });

    if (outcome === "approved" && normalized !== "unknown") {
      bloomFilterService.add(`${userId}_${normalized}`);
    }

    return res.status(200).json({
      success: true,
      message: outcome === "approved"
        ? "Item approved and moved to your main profile database."
        : "Item already approved or moved."
    });
  } catch (error) {
    console.error("Error approving staging item:", error?.stack || error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
};

export const bulkApproveStagingItemsController = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized user." });
    }

    const ids = uniqueValidIds((req.body || {}).ids);

    if (ids.length === 0) {
      return res.status(400).json({ success: false, error: "Array of staging item IDs is required." });
    }

    if (ids.length > MAX_BULK_IDS) {
      return res.status(413).json({ success: false, error: `Too many items. Send at most ${MAX_BULK_IDS} IDs per request.` });
    }

    let approved = 0;
    let duplicates = 0;
    let missing = 0;
    const seenInRequest = new Set();

    for (const idChunk of chunk(ids, APPROVE_CHUNK)) {
      const snaps = await db.getAll(...idChunk.map((id) => stagingCollection.doc(id)));
      const batch = db.batch();
      const approvedNames = [];

      for (const snap of snaps) {
        if (!snap.exists || snap.data().userId !== userId) {
          missing++;
          continue;
        }

        const profile = buildProfileFromStaging(snap.data(), userId);
        const normalized = profile.normalizedUsername;
        let isDuplicate = false;

        if (normalized !== "unknown") {
          if (seenInRequest.has(normalized)) {
            isDuplicate = true;
          } else if (bloomFilterService.has(`${userId}_${normalized}`) && (await profileService.checkProfileExists(normalized, userId))) {
            isDuplicate = true;
          }
        }

        if (isDuplicate) {
          batch.delete(snap.ref);
          duplicates++;
          continue;
        }

        if (normalized !== "unknown") seenInRequest.add(normalized);

        batch.set(profilesCollection.doc(), profile);
        batch.delete(snap.ref);
        approvedNames.push(normalized);
        approved++;
      }

      await batch.commit();

      approvedNames.forEach((name) => {
        if (name !== "unknown") bloomFilterService.add(`${userId}_${name}`);
      });
    }

    return res.status(200).json({
      success: true,
      message: `Successfully approved ${approved} items.`,
      addedCount: approved,
      duplicateCount: duplicates,
      missingCount: missing
    });
  } catch (error) {
    console.error("Error bulk approving staging items:", error?.stack || error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
};

export const bulkDeleteStagingItemsController = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized user." });
    }

    const ids = uniqueValidIds((req.body || {}).ids);

    if (ids.length === 0) {
      return res.status(400).json({ success: false, error: "Array of staging item IDs is required." });
    }

    if (ids.length > MAX_BULK_IDS) {
      return res.status(413).json({ success: false, error: `Too many items. Send at most ${MAX_BULK_IDS} IDs per request.` });
    }

    for (const idChunk of chunk(ids, DELETE_CHUNK)) {
      const snaps = await db.getAll(...idChunk.map((id) => stagingCollection.doc(id)));
      const batch = db.batch();
      snaps.forEach((snap) => {
        if (snap.exists && snap.data().userId === userId) {
          batch.delete(snap.ref);
        }
      });
      await batch.commit();
    }

    return res.status(200).json({
      success: true,
      message: `Successfully deleted selected items.`
    });
  } catch (error) {
    console.error("Error bulk deleting staging items:", error?.stack || error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
};

export const deleteStagingItemController = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized user." });
    }

    if (!isValidDocId(id)) {
      return res.status(400).json({ success: false, error: "A valid staging item ID is required." });
    }

    const docRef = stagingCollection.doc(id);
    const docSnap = await docRef.get();

    if (docSnap.exists && docSnap.data().userId === userId) {
      await docRef.delete();
    }

    return res.status(200).json({ success: true, message: "Item removed from staging queue." });
  } catch (error) {
    console.error("Error deleting staging item:", error?.stack || error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
};