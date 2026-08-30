import { db } from "../config/firebase.js";
import * as bloomFilterService from "../services/bloomFilterService.js";
import * as scraperService from "../services/scraperService.js";
import * as aiService from "../services/aiService.js";
import * as profileService from "../services/profileService.js";

const stagingCollection = db.collection("staging");
const profilesCollection = db.collection("profiles");

// Helper to extract reel URLs and handles
const parseReelInput = (input) => {
  if (!input || typeof input !== "string") return [];
  
  // Extract all links matching instagram.com/(reel|p)/
  const urlRegex = /(https?:\/\/(?:www\.)?instagram\.com\/(?:reel|p)\/[a-zA-Z0-9_-]+)/gi;
  const matches = input.match(urlRegex) || [];
  
  // Clean URL tracking query parameters
  return [...new Set(matches.map((url) => {
    try {
      const parsed = new URL(url);
      return `${parsed.origin}${parsed.pathname}`;
    } catch {
      return url.split("?")[0];
    }
  }))];
};

/**
 * Handle incoming shares from Web Share Target or bulk paste into Staging
 * Returns instantly, runs Gemini AI multimodal analysis via the frontend Auto-Queue.
 */
export const shareReelController = async (req, res) => {
  try {
    const { url, text, title } = req.body;
    const rawContent = `${url || ""} ${text || ""} ${title || ""}`.trim();

    if (!rawContent) {
      return res.status(400).json({
        success: false,
        error: "No share payload or URL provided."
      });
    }

    const reelUrls = parseReelInput(rawContent);

    if (reelUrls.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid Instagram reel links found in the submission."
      });
    }

    const added = [];
    const skipped = [];

    for (const reelUrl of reelUrls) {
      // 1. Fast metadata extraction (Extracts ALL collaborators instantly)
      const parsedMeta = await scraperService.extractBasicInfo(reelUrl);
      
      const handlesToProcess = parsedMeta.usernames && parsedMeta.usernames.length > 0
        ? parsedMeta.usernames
        : ["Unknown"];

      // Process EVERY collaborator found on the reel
      for (const handle of handlesToProcess) {
        const normalizedHandle = handle.toLowerCase().trim();

        // 2. Ultra-Fast Bloom Filter Check For Username
        if (normalizedHandle && normalizedHandle !== 'unknown' && bloomFilterService.has(normalizedHandle)) {
          const exists = await profileService.checkProfileExists(normalizedHandle);
          if (exists) {
            skipped.push({ url: reelUrl, username: normalizedHandle, reason: "Creator already in database" });
            continue;
          }
        }

        // 3. Check if exact reel URL + username combo is already in current staging queue
        const stagingCheck = await stagingCollection.where("url", "==", reelUrl).where("username", "==", normalizedHandle).get();
        if (!stagingCheck.empty) {
          skipped.push({ url: reelUrl, username: normalizedHandle, reason: "Already pending in staging queue" });
          continue;
        }

        // 4. Check if exact reel URL + username combo is already approved in MAIN profile database
        const profileUrlCheck = await profilesCollection.where("sourceUrl", "==", reelUrl).where("username", "==", normalizedHandle).get();
        if (!profileUrlCheck.empty) {
          skipped.push({ url: reelUrl, username: normalizedHandle, reason: "Creator from this reel already exists in approved profiles database" });
          continue;
        }

        // 5. Save initial state instantly so the UI registers it immediately
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

    // Instantly return success to the phone
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
    return res.status(500).json({
      success: false,
      error: "Internal server error."
    });
  }
};

/**
 * Fetch all pending items in Staging Queue
 */
export const getStagingQueueController = async (req, res) => {
  try {
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
    return res.status(500).json({
      success: false,
      error: "Internal server error."
    });
  }
};

/**
 * Trigger AI Multimodal analysis (Split into Two Steps to beat Vercel's 10s limit)
 */
export const processStagingItemController = async (req, res) => {
  try {
    const { id } = req.params;
    const { step } = req.query; // Reads ?step=scrape or ?step=analyze
    const { username: customUsername } = req.body; // Allows frontend to send manual username corrections

    if (!id) {
      return res.status(400).json({ success: false, error: "Staging item ID is required." });
    }

    const docRef = stagingCollection.doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: "Staging item not found." });
    }

    const itemData = docSnap.data();

    // If the frontend sent a custom username, update it in the database immediately
    if (customUsername && customUsername !== itemData.username) {
      itemData.username = customUsername;
      await docRef.update({ username: customUsername });
    }

    // ==========================================
    // STEP 1: THE SCRAPER PHASE (Takes ~4 seconds)
    // ==========================================
    if (step === 'scrape') {
      const richMedia = await scraperService.fetchFullReelMedia(itemData.url, itemData.username);
      
      // Save the raw scraped data temporarily so step 2 can read it
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

    // ==========================================
    // STEP 2: THE AI PHASE (Takes ~6 seconds)
    // ==========================================
    if (step === 'analyze') {
      const targetData = itemData.tempScrapeData || {
        videoUrl: "",
        thumbnailUrl: itemData.thumbnailUrl,
        caption: itemData.caption,
        username: itemData.username
      };

      let aiResult = null;

      try {
        // AI runs using dynamic key rotation flawlessly
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
        
        // Remove the mask! Honestly fail the row so the UI knows to retry.
        await docRef.update({ status: "failed" });
        return res.status(500).json({ 
          success: false, 
          error: "AI limit reached or model failed. Please retry later.", 
          status: "failed" 
        });
      }

      const accountType = (aiResult.accountType?.value || "").toLowerCase();

      // AUTO-FILTER: If AI detects male/brand, delete it from the queue instantly.
      if (accountType.includes('male') || accountType.includes('brand')) {
        console.log(`[Auto-Filter] Automatically rejected ${targetData.username} (Classified as: ${accountType})`);
        await docRef.delete();
        return res.status(200).json({ 
          success: true, 
          message: "Auto-deleted: Male or Brand detected", 
          deleted: true 
        });
      }

      // Update staging doc with final analysis and clean up the tempScrapeData
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
        tempScrapeData: db.FieldValue ? db.FieldValue.delete() : null // Safely delete temp data
      };

      // Workaround for older firebase-admin versions if FieldValue.delete() fails
      if (!updates.tempScrapeData) delete updates.tempScrapeData;

      await docRef.update(updates);

      // Return final preview payload for UI
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
    
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to analyze reel.",
      stack: error.stack || "No stack trace available"
    });
  }
};

/**
 * Approve a single item: Move from Staging to Main Profiles Database
 */
export const approveStagingItemController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, error: "Staging item ID is required." });
    }

    const docRef = stagingCollection.doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: "Staging item not found." });
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

    return res.status(200).json({
      success: true,
      message: "Item approved and moved to main profile database."
    });
  } catch (error) {
    console.error("Error approving staging item:", error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
};

/**
 * Bulk Approve items: Move multiple from Staging to Main Profiles Database
 */
export const bulkApproveStagingItemsController = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: "Array of staging item IDs is required." });
    }

    const addedCount = [];

    for (const id of ids) {
      const docRef = stagingCollection.doc(id);
      const docSnap = await docRef.get();

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

        await profilesCollection.add(newProfile);

        if (newProfile.username && newProfile.username !== "Unknown") {
          bloomFilterService.add(newProfile.username.toLowerCase());
        }

        await docRef.delete();
        addedCount.push(id);
      }
    }

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
 * Bulk Delete items: Instantly wipe multiple/all items from the queue
 */
export const bulkDeleteStagingItemsController = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: "Array of staging item IDs is required." });
    }

    for (const id of ids) {
      await stagingCollection.doc(id).delete();
    }

    return res.status(200).json({
      success: true,
      message: `Successfully deleted ${ids.length} items.`
    });
  } catch (error) {
    console.error("Error bulk deleting staging items:", error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
};

/**
 * Remove an item from the Staging Queue
 */
export const deleteStagingItemController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Staging item ID is required."
      });
    }

    await stagingCollection.doc(id).delete();

    return res.status(200).json({
      success: true,
      message: "Item removed from staging queue."
    });
  } catch (error) {
    console.error("Error deleting staging item:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error."
    });
  }
};