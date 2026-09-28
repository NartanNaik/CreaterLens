import axios from "axios";

// To make this work, sign up for a free/cheap Instagram Scraper API on RapidAPI 
// (e.g., "Instagram Scraper API" or "RocketAPI") and drop the keys in your Vercel Environment Variables.
const RAPID_API_KEY = process.env.RAPIDAPI_KEY || "";
const RAPID_API_HOST = process.env.RAPIDAPI_HOST || "instagram-scraper-api2.p.rapidapi.com";

const cleanInstagramUrl = (rawUrl) => {
  try {
    const parsed = new URL(rawUrl);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return rawUrl.split("?")[0];
  }
};

/**
 * 1. Fast extraction for the Staging Queue
 * Pulls clean JSON directly from the API, entirely bypassing HTML blocking.
 */
export const extractBasicInfo = async (reelUrl) => {
  const cleanUrl = cleanInstagramUrl(reelUrl);
  
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

    return {
      url: cleanUrl,
      usernames: data.user ? [data.user.username] : [],
      thumbnailUrl: data.thumbnail_url || "",
      caption: data.caption?.text || ""
    };
  } catch (error) {
    console.warn(`⚠️ [Scraper API] Fast extract failed for ${cleanUrl}.`);
    return { url: cleanUrl, usernames: [], thumbnailUrl: "", caption: "" };
  }
};

/**
 * 2. Deep extraction for the AI Engine
 * Injects accurate API analytics straight into the AI prompt block.
 */
export const fetchFullReelMedia = async (reelUrl, specificUsername = "") => {
  const cleanUrl = cleanInstagramUrl(reelUrl);
  
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
    const trueUsername = specificUsername || data.user?.username || "";
    
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
    return { url: cleanUrl, username: specificUsername || "", caption: "", thumbnailUrl: "", videoUrl: "" };
  }
};