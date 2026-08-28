import { db } from "../config/firebase.js";
import * as bloomFilterService from "../services/bloomFilterService.js";
import * as scraperService from "../services/scraperService.js";
import * as aiService from "../services/aiService.js";
import * as profileService from "../services/profileService.js";

const stagingCollection = db.collection("staging");

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
      // 1. Fast metadata extraction (extract handle & reel ID)
      const parsedMeta = await scraperService.extractBasicInfo(reelUrl);
      const normalizedHandle = (parsedMeta.username || "").toLowerCase().trim();

      // 2. Ultra-Fast Bloom Filter Check
      if (normalizedHandle && bloomFilterService.has(normalizedHandle)) {
        // Confirm if it's a true match in Firestore to avoid false positive drops
        const exists = await profileService.checkProfileExists(normalizedHandle);
        if (exists) {
          skipped.push({ url: reelUrl, username: normalizedHandle, reason: "Creator already in database" });
          continue;
        }
      }

      // 3. Check if already in current staging queue
      const stagingCheck = await stagingCollection.where("url", "==", reelUrl).get();
      if (!stagingCheck.empty) {
        skipped.push({ url: reelUrl, username: normalizedHandle, reason: "Already pending in staging queue" });
        continue;
      }

      // 4. Add to Staging Queue (Unprocessed)
      const stagingDoc = {
        url: reelUrl,
        username: parsedMeta.username || "",
        thumbnailUrl: parsedMeta.thumbnailUrl || "",
        caption: parsedMeta.caption || "",
        status: "pending", // 'pending' | 'analyzed' | 'approved'
        createdAt: new Date().toISOString()
      };

      const docRef = await stagingCollection.add(stagingDoc);
      added.push({ id: docRef.id, ...stagingDoc });
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
 * Trigger AI Multimodal analysis for a specific staging item
 */
export const processStagingItemController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Staging item ID is required."
      });
    }

    const docRef = stagingCollection.doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({
        success: false,
        error: "Staging item not found."
      });
    }

    const itemData = docSnap.data();

    // 1. Fetch rich media/video direct stream url and captions
    const richMedia = await scraperService.fetchFullReelMedia(itemData.url);

    // 2. Call Gemini Multi-Key / Multi-Model AI analysis
    const aiResult = await aiService.analyzeReelMedia({
      videoUrl: richMedia.videoUrl,
      thumbnailUrl: richMedia.thumbnailUrl || itemData.thumbnailUrl,
      caption: richMedia.caption || itemData.caption,
      username: richMedia.username || itemData.username
    });

    // 3. Return preview payload for human approval screen
    return res.status(200).json({
      success: true,
      data: {
        stagingId: id,
        reelUrl: itemData.url,
        videoPreviewUrl: richMedia.videoUrl,
        thumbnailUrl: richMedia.thumbnailUrl || itemData.thumbnailUrl,
        ...aiResult
      }
    });
  } catch (error) {
    console.error("Error analyzing staging reel:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to analyze reel."
    });
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