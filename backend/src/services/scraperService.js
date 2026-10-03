import axios from "axios";

// To make this work, sign up for a free/cheap Instagram Scraper API on RapidAPI 
// (e.g., "Instagram Scraper API" or "RocketAPI") and drop the keys in your Vercel Environment Variables.
const RAPID_API_KEY = process.env.RAPIDAPI_KEY || "";
const RAPID_API_HOST = process.env.RAPIDAPI_HOST || "instagram-scraper-api2.p.rapidapi.com";

// 1. Enhanced URL Cleaner: Aggressively strips mobile `igsh` tracking tags and trailing slashes
const cleanInstagramUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  try {
    const parsed = new URL(rawUrl.trim());
    return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, "");
  } catch {
    return rawUrl.split("?")[0].trim().replace(/\/$/, "");
  }
};

// 2. Fallback Extractor: If a user shares a raw profile link instead of a reel (which crashes the post API), rip the username directly from the URL.
const attemptFallbackUsername = (url) => {
  const profileMatch = url.match(/(?:instagram\.com|instagr\.am)\/([A-Za-z0-9_.]+)/);
  if (profileMatch && !['p', 'reel', 'tv', 'stories', 'explore'].includes(profileMatch[1])) {
    return profileMatch[1];
  }
  return "Unknown";
};

/**
 * 1. Fast extraction for the Staging Queue
 * Pulls clean JSON directly from the API, entirely bypassing HTML blocking.
 */
export const extractBasicInfo = async (reelUrl) => {
  const cleanUrl = cleanInstagramUrl(reelUrl);
  const fallbackUser = attemptFallbackUsername(cleanUrl);
  
  try {
    if (!RAPID_API_KEY) {
      throw new Error("RAPIDAPI_KEY is missing from environment variables.");
    }

    const response = await axios.get(`https://${RAPID_API_HOST}/v1/post_info`, {
      params: { code_or_id_or_url: cleanUrl },
      headers: {
        'X-RapidAPI-Key': RAPID_API_KEY,
        'X-RapidAPI-Host': RAPID_API_HOST
      },
      timeout: 4000 // Fast fail to respect Vercel limits
    });

    const data = response.data?.data || {};
    
    // Safely extract username: Try API first, then regex fallback
    const username = data.user?.username || fallbackUser;

    return {
      url: cleanUrl,
      usernames: username !== "Unknown" ? [username] : [],
      thumbnailUrl: data.thumbnail_url || "",
      caption: data.caption?.text || ""
    };
  } catch (error) {
    console.warn(`⚠️ [Scraper API] Fast extract failed for ${cleanUrl}. Falling back to Regex.`);
    return { 
      url: cleanUrl, 
      usernames: fallbackUser !== "Unknown" ? [fallbackUser] : [], 
      thumbnailUrl: "", 
      caption: "" 
    };
  }
};

/**
 * 2. Deep extraction for the AI Engine
 * Injects accurate API analytics straight into the AI prompt block.
 */
export const fetchFullReelMedia = async (reelUrl, specificUsername = "") => {
  const cleanUrl = cleanInstagramUrl(reelUrl);
  const fallbackUser = specificUsername || attemptFallbackUsername(cleanUrl);
  
  try {
    if (!RAPID_API_KEY) {
      throw new Error("RAPIDAPI_KEY is missing from environment variables.");
    }

    const response = await axios.get(`https://${RAPID_API_HOST}/v1/post_info`, {
      params: { code_or_id_or_url: cleanUrl },
      headers: {
        'X-RapidAPI-Key': RAPID_API_KEY,
        'X-RapidAPI-Host': RAPID_API_HOST
      },
      timeout: 6000 
    });

    const data = response.data?.data || {};
    const trueUsername = data.user?.username || fallbackUser;
    
    let finalCaption = data.caption?.text || "";

    if (data.user) {
      finalCaption += `\n\n[SYSTEM - Deep Scrape Data]:
        - True Username: ${trueUsername}
        - Total Followers: ${data.user.follower_count || "Unknown"}
        - Post Likes: ${data.like_count || 0}
        - Post Comments: ${data.comment_count || 0}
        - Post Views: ${data.view_count || data.play_count || 0}`;
    }

    return {
      url: cleanUrl,
      username: trueUsername,
      caption: finalCaption,
      thumbnailUrl: data.thumbnail_url || "",
      videoUrl: data.video_url || data.thumbnail_url || ""
    };
  } catch (error) {
    console.error(`❌ [Scraper API] Deep media fetch failed:`, error.message);
    return { 
      url: cleanUrl, 
      username: fallbackUser !== "Unknown" ? fallbackUser : "", 
      caption: "", 
      thumbnailUrl: "", 
      videoUrl: "" 
    };
  }
};