import { db } from "../config/firebase.js";
import * as bloomFilterService from "../services/bloomFilterService.js";
import * as scraperService from "../services/scraperService.js";
import * as aiService from "../services/aiService.js";
import * as profileService from "../services/profileService.js";

const stagingCollection = db.collection("staging");
const profilesCollection = db.collection("profiles");

const parseReelInput = (input) => {
  if (!input || typeof input !== "string") return [];
  const urlRegex = /(https?:\/\/(?:www\.)?instagram\.com\/(?:reel|p)\/[a-zA-Z0-9_-]+)/gi;
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

export const shareReelController = async (req, res) => {
  try {
    const { url, text, title } = req.body;
    const rawContent = `${url || ""} ${text || ""} ${title || ""}`.trim();

    if (!rawContent) {
      return res.status(400).json({ success: false, error: "No share payload or URL provided." });
    }

    const reelUrls = parseReelInput(rawContent);

    if (reelUrls.length === 0) {
      return res.status(400).json({ success: false, error: "No valid Instagram reel links found in the submission." });
    }

    const added = [];
    const skipped = [];

    for (const reelUrl of reelUrls) {
      const parsedMeta = await scraperService.extractBasicInfo(reelUrl);
      const handlesToProcess = parsedMeta.usernames && parsedMeta.usernames.length > 0
        ? parsedMeta.usernames
        : ["Unknown"];

      for (const handle of handlesToProcess) {
        const normalizedHandle = handle.toLowerCase().trim();

        if (normalizedHandle && normalizedHandle !== 'unknown' && bloomFilterService.has(normalizedHandle)) {
          const exists = await profileService.checkProfileExists(normalizedHandle);
          if (exists) {
            skipped.push({ url: reelUrl, username: normalizedHandle, reason: "Creator already in database" });
            continue;
          }
        }

        const stagingCheck = await stagingCollection.where("url", "==", reelUrl).where("username", "==", normalizedHandle).get();
        if (!stagingCheck.empty) {
          skipped.push({ url: reelUrl, username: normalizedHandle, reason: "Already pending in staging queue" });
          continue;
        }

        const profileUrlCheck = await profilesCollection.where("sourceUrl", "==", reelUrl).where("username", "==", normalizedHandle).get();
        if (!profileUrlCheck.empty) {
          skipped.push({ url: reelUrl, username: normalizedHandle, reason: "Creator from this reel already exists in approved profiles database" });
          continue;
        }

        const stagingDoc = {
          url: reelUrl,
          username: handle,
          thumbnailUrl: parsedMeta.thumbnailUrl || "",
          caption: parsedMeta.caption || "",
          status: "pending",
          createdAt: new Date().toISOString()
        };

        const docRef = await stagingCollection.add(stagingDoc);
        added.push({ id: docRef.id, ...stagingDoc });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Processed ${reelUrls.length} links. Added: ${added.length}, Skipped: ${skipped.length}`,
      addedCount: added.length,
      skippedCount: skipped.length,
      added,
      skipped
    });
  } catch (error) {
    console.error("Error handling share target:", error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
};

export const bulkImportStagingItemsController = async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: "No valid items provided for bulk import." });
    }

    const added = [];
    const skipped = [];

    for (const item of items) {
      const reelUrl = item.url;
      const handle = item.username;
      const normalizedHandle = handle ? handle.toLowerCase().trim() : "unknown";

      if (normalizedHandle !== 'unknown' && bloomFilterService.has(normalizedHandle)) {
        const exists = await profileService.checkProfileExists(normalizedHandle);
        if (exists) {
          skipped.push({ url: reelUrl, username: normalizedHandle, reason: "Creator already in database" });
          continue;
        }
      }

      const stagingCheck = await stagingCollection.where("url", "==", reelUrl).where("username", "==", normalizedHandle).get();
      if (!stagingCheck.empty) {
        skipped.push({ url: reelUrl, username: normalizedHandle, reason: "Already pending in staging queue" });
        continue;
      }

      const profileUrlCheck = await profilesCollection.where("sourceUrl", "==", reelUrl).where("username", "==", normalizedHandle).get();
      if (!profileUrlCheck.empty) {
        skipped.push({ url: reelUrl, username: normalizedHandle, reason: "Creator from this reel already exists in approved profiles database" });
        continue;
      }

      const stagingDoc = {
        url: reelUrl,
        username: handle,
        thumbnailUrl: item.thumbnailUrl || "",
        caption: item.caption || "",
        status: "pending",
        createdAt: new Date().toISOString()
      };

      const docRef = await stagingCollection.add(stagingDoc);
      added.push({ id: docRef.id, ...stagingDoc });
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
    console.error("Error in bulk import:", error);
    return res.status(500).json({ success: false, error: "Internal server error during bulk import." });
  }
};

export const getStagingQueueController = async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    const snapshot = await stagingCollection.orderBy("createdAt", "desc").get();
    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    return res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    console.error("Error fetching staging queue:", error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
};

export const processStagingItemController = async (req, res) => {
  try {
    const { id } = req.params;
    const { step } = req.query; 
    const { username: customUsername } = req.body; 

    if (!id) {
      return res.status(400).json({ success: false, error: "Staging item ID is required." });
    }

    const docRef = stagingCollection.doc(id);
    const docSnap = await docRef.get();

    // THE FIX: Return 200 OK instead of 404 if the background loop hits a deleted ghost item
    if (!docSnap.exists) {
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
      await docRef.update({ username: customUsername });
    }

    if (step === 'scrape') {
      const richMedia = await scraperService.fetchFullReelMedia(itemData.url, itemData.username);
      
      await docRef.update({
        tempScrapeData: {
          videoUrl: richMedia.videoUrl || "",
          thumbnailUrl: richMedia.thumbnailUrl || itemData.thumbnailUrl || "",
          caption: richMedia.caption || itemData.caption || "",
          username: richMedia.username || itemData.username || ""
        },
        status: "scraping_done"
      });

      return res.status(200).json({ success: true, message: "Scrape complete, ready for AI." });
    }

    if (step === 'analyze') {
      const targetData = itemData.tempScrapeData || {
        videoUrl: "",
        thumbnailUrl: itemData.thumbnailUrl,
        caption: itemData.caption,
        username: itemData.username
      };

      let aiResult = null;

      try {
        aiResult = await aiService.analyzeReelMedia({
          videoUrl: targetData.videoUrl,
          thumbnailUrl: targetData.thumbnailUrl,
          caption: targetData.caption,
          username: targetData.username
        });

        if (!aiResult || typeof aiResult !== 'object') {
          throw new Error("Invalid AI Response format returned");
        }
      } catch (aiError) {
        console.error(`[AI Fallback] Failed for ${targetData.username}. Reason: ${aiError.message}`);
        await docRef.update({ status: "failed" });
        return res.status(500).json({ success: false, error: "AI limit reached or model failed.", status: "failed" });
      }

      const accountType = (aiResult.accountType?.value || "").toLowerCase();

      if (accountType.includes('male') || accountType.includes('brand')) {
        console.log(`[Auto-Filter] Automatically rejected ${targetData.username} (Classified as: ${accountType})`);
        await docRef.delete();
        return res.status(200).json({ success: true, message: "Auto-deleted: Male or Brand detected", deleted: true });
      }

      const updates = {
        username: targetData.username || "",
        nation: aiResult.nation?.value || "-",
        skinTone: aiResult.skinTone?.value || "-",
        bodyType: aiResult.bodyType?.value || "-",
        reelType: aiResult.reelType?.value || "-",
        specialPart: aiResult.specialPart?.value || "-",
        ageRange: aiResult.ageRange?.value || "-",
        totalFollowers: aiResult.totalFollowers || 0,
        avgViewsPerWeek: aiResult.avgViewsPerWeek || 0,
        avgLikes: aiResult.avgLikes || 0,
        avgComments: aiResult.avgComments || 0,
        status: "analyzed",
        tempScrapeData: db.FieldValue ? db.FieldValue.delete() : null
      };

      if (!updates.tempScrapeData) delete updates.tempScrapeData;

      await docRef.update(updates);

      return res.status(200).json({
        success: true,
        data: {
          stagingId: id,
          reelUrl: itemData.url,
          videoPreviewUrl: targetData.videoUrl,
          thumbnailUrl: targetData.thumbnailUrl,
          ...updates
        }
      });
    }

    return res.status(400).json({ success: false, error: "Missing valid ?step query parameter." });

  } catch (error) {
    console.error("CRITICAL Backend Error analyzing staging reel:", error);
    await stagingCollection.doc(req.params.id).update({ status: "failed" });
    return res.status(500).json({ success: false, error: error.message || "Failed to analyze reel." });
  }
};

export const approveStagingItemController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, error: "Staging item ID is required." });
    }

    const docRef = stagingCollection.doc(id);
    const docSnap = await docRef.get();

    // THE FIX: Return 200 OK instead of 404 to silence the ghost errors
    if (!docSnap.exists) {
      return res.status(200).json({ 
        success: true, 
        deleted: true, 
        alreadyProcessed: true,
        message: "Item already approved or moved." 
      });
    }

    const itemData = docSnap.data();

    const newProfile = {
      username: itemData.username || "Unknown",
      nation: itemData.nation || "",
      skinTone: itemData.skinTone || "",
      bodyType: itemData.bodyType || "",
      reelType: itemData.reelType || "",
      specialPart: itemData.specialPart || "",
      ageRange: itemData.ageRange || "",
      totalFollowers: itemData.totalFollowers || 0,
      avgViewsPerWeek: itemData.avgViewsPerWeek || 0,
      avgLikes: itemData.avgLikes || 0,
      avgComments: itemData.avgComments || 0,
      playable: false,
      sourceUrl: itemData.url || "",
      createdAt: new Date().toISOString()
    };

    await profilesCollection.add(newProfile);

    if (newProfile.username !== "Unknown") {
      bloomFilterService.add(newProfile.username.toLowerCase());
    }

    await docRef.delete();

    return res.status(200).json({ success: true, message: "Item approved and moved to main profile database." });
  } catch (error) {
    console.error("Error approving staging item:", error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
};

/**
 * Bulk Approve items: Move multiple from Staging to Main Profiles Database (Parallelized for Vercel)
 */
export const bulkApproveStagingItemsController = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: "Array of staging item IDs is required." });
    }

    // Cap at 250 items per request to guarantee it finishes under Vercel's 10-second limit
    const chunkToProcess = ids.slice(0, 250);
    const addedCount = [];

    // WAVE 1: Read all documents at the exact same time
    const readPromises = chunkToProcess.map(id => stagingCollection.doc(id).get());
    const docs = await Promise.all(readPromises);

    const writePromises = [];

    for (const docSnap of docs) {
      if (docSnap.exists) {
        const itemData = docSnap.data();

        const newProfile = {
          username: itemData.username || "Unknown",
          nation: itemData.nation || "",
          skinTone: itemData.skinTone || "",
          bodyType: itemData.bodyType || "",
          reelType: itemData.reelType || "",
          specialPart: itemData.specialPart || "",
          ageRange: itemData.ageRange || "",
          totalFollowers: itemData.totalFollowers || 0,
          avgViewsPerWeek: itemData.avgViewsPerWeek || 0,
          avgLikes: itemData.avgLikes || 0,
          avgComments: itemData.avgComments || 0,
          playable: false,
          sourceUrl: itemData.url || "",
          createdAt: new Date().toISOString()
        };

        if (newProfile.username && newProfile.username !== "Unknown") {
          bloomFilterService.add(newProfile.username.toLowerCase());
        }

        // WAVE 2 PREP: Queue up all writes and deletes to happen concurrently
        writePromises.push(profilesCollection.add(newProfile));
        writePromises.push(stagingCollection.doc(docSnap.id).delete());
        
        addedCount.push(docSnap.id);
      }
    }

    // WAVE 2 EXECUTE: Fire all writes/deletes at the exact same time
    await Promise.all(writePromises);

    return res.status(200).json({ 
      success: true, 
      message: `Successfully approved ${addedCount.length} items.`, 
      addedCount: addedCount.length 
    });
  } catch (error) {
    console.error("Error bulk approving staging items:", error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
};

/**
 * Bulk Delete items: Instantly wipe multiple/all items from the queue (Parallelized)
 */
export const bulkDeleteStagingItemsController = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: "Array of staging item IDs is required." });
    }

    const chunkToProcess = ids.slice(0, 250);

    // Fire all deletes concurrently
    const deletePromises = chunkToProcess.map(id => stagingCollection.doc(id).delete());
    await Promise.all(deletePromises);

    return res.status(200).json({ 
      success: true, 
      message: `Successfully deleted ${chunkToProcess.length} items.` 
    });
  } catch (error) {
    console.error("Error bulk deleting staging items:", error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
};

export const deleteStagingItemController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, error: "Staging item ID is required." });
    }

    // Firestore .delete() naturally succeeds even if the document does not exist, so no exists check is needed here
    await stagingCollection.doc(id).delete();

    return res.status(200).json({ success: true, message: "Item removed from staging queue." });
  } catch (error) {
    console.error("Error deleting staging item:", error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
};