import axios from "axios";
import * as cheerio from "cheerio";

// Standard mobile user agent to bypass basic bot-blocks
const USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1";

/**
 * Helper to clean URL tracking junk (e.g., ?igsh=..., &utm_source=...)
 * Ensures we don't treat the exact same Reel as two different items.
 */
const cleanInstagramUrl = (rawUrl) => {
  try {
    const parsed = new URL(rawUrl);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return rawUrl.split("?")[0];
  }
};

/**
 * Parses the HTML to find the username and caption from OpenGraph tags.
 * Instagram usually formats og:description like: "Username on Instagram: \"Caption text...\""
 */
const parseOpenGraphData = (html) => {
  const $ = cheerio.load(html);
  
  const title = $("meta[property='og:title']").attr("content") || "";
  const description = $("meta[property='og:description']").attr("content") || "";
  const thumbnailUrl = $("meta[property='og:image']").attr("content") || "";
  const videoUrl = $("meta[property='og:video']").attr("content") || "";

  // Attempt to extract username from title (e.g., "Username on Instagram:...")
  let username = "";
  const titleMatch = title.match(/(.+?) on Instagram/i);
  if (titleMatch && titleMatch[1]) {
    username = titleMatch[1].trim();
  } else {
    // Fallback: Sometimes it's in the description
    const descMatch = description.match(/(.+?) on Instagram/i);
    if (descMatch && descMatch[1]) {
      username = descMatch[1].trim();
    }
  }

  // Attempt to extract caption
  let caption = description;
  const captionSplit = description.split(':"');
  if (captionSplit.length > 1) {
    caption = captionSplit.slice(1).join(':"').replace(/"$/, "").trim();
  }

  return { username, caption, thumbnailUrl, videoUrl };
};

/**
 * 1. Fast extraction for the Staging Queue
 * Pulls the absolute minimum needed to list the item in your inbox.
 */
export const extractBasicInfo = async (reelUrl) => {
  const cleanUrl = cleanInstagramUrl(reelUrl);
  
  try {
    const response = await axios.get(cleanUrl, {
      headers: { "User-Agent": USER_AGENT },
      timeout: 5000,
    });

    const ogData = parseOpenGraphData(response.data);

    return {
      url: cleanUrl,
      username: ogData.username,
      thumbnailUrl: ogData.thumbnailUrl,
      caption: ogData.caption
    };
  } catch (error) {
    console.warn(`⚠️ [Scraper] Fast extract failed for ${cleanUrl}. Applying fallback.`);
    
    // Fallback: If blocked, try to guess the username from the URL structure if it's a profile link,
    // otherwise just return the clean URL so it still enters the Staging Queue.
    return {
      url: cleanUrl,
      username: "", 
      thumbnailUrl: "",
      caption: ""
    };
  }
};

/**
 * 2. Deep extraction for the AI Engine
 * Attempts to pull the direct MP4 stream or high-res thumbnail for Gemini Vision.
 */
export const fetchFullReelMedia = async (reelUrl) => {
  const cleanUrl = cleanInstagramUrl(reelUrl);
  
  try {
    const response = await axios.get(cleanUrl, {
      headers: { "User-Agent": USER_AGENT },
      timeout: 8000, // Slightly longer timeout for deeper fetch
    });

    const ogData = parseOpenGraphData(response.data);

    // If Instagram blocks the video URL, we pass the high-res thumbnail to the AI instead.
    return {
      url: cleanUrl,
      username: ogData.username,
      caption: ogData.caption,
      thumbnailUrl: ogData.thumbnailUrl,
      videoUrl: ogData.videoUrl || ogData.thumbnailUrl 
    };
  } catch (error) {
    console.error(`❌ [Scraper] Deep media fetch failed for ${cleanUrl}:`, error.message);
    
    // Graceful failure: return what we have so the AI can at least try
    // to analyze the URL or fail gracefully rather than crashing the server.
    return {
      url: cleanUrl,
      username: "",
      caption: "",
      thumbnailUrl: "",
      videoUrl: ""
    };
  }
};