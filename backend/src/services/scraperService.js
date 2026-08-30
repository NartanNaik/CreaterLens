import axios from "axios";
import * as cheerio from "cheerio";

// Standard mobile user agent to bypass basic bot-blocks
const USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1";

/**
 * Helper to correctly parse formatted numbers like "1.5M", "10K", or "1,200" into raw integers
 */
const parseCount = (str) => {
  if (!str) return 0;
  let numStr = str.toString().toUpperCase().replace(/,/g, '');
  let multiplier = 1;
  
  if (numStr.includes('M')) {
    multiplier = 1000000;
    numStr = numStr.replace('M', '');
  } else if (numStr.includes('K')) {
    multiplier = 1000;
    numStr = numStr.replace('K', '');
  }
  
  const parsed = parseFloat(numStr);
  return isNaN(parsed) ? 0 : Math.floor(parsed * multiplier);
};

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
 * Bulletproof Multiple Username Extractor: Hunts down ALL collaborators across different potential locations
 * in the Instagram HTML, bypassing their obfuscation attempts.
 */
const extractAllUsernames = (html, description, title) => {
  const usernames = new Set();

  // 1. Look for co-authors (Collaborators on the reel) inside JSON state
  const coauthorsMatch = html.match(/"coauthor_producers":\[(.*?)\]/);
  if (coauthorsMatch && coauthorsMatch[1]) {
    const matches = [...coauthorsMatch[1].matchAll(/"username":"([^"]+)"/g)];
    matches.forEach(m => usernames.add(m[1]));
  }

  // 2. Look for the main owner as a fallback in JSON state
  const ownerMatch = html.match(/"owner":\{[^{]*"username":"([^"]+)"/);
  if (ownerMatch && ownerMatch[1]) {
    usernames.add(ownerMatch[1]);
  }

  // 3. Look for the iOS app link meta tag (Extremely reliable on Reel pages)
  const iosMatch = html.match(/instagram:\/\/user\?username=([a-zA-Z0-9._]+)/);
  if (iosMatch && iosMatch[1]) usernames.add(iosMatch[1]);

  // 4. Look for (@username) pattern in the description tag
  const handleMatch = description.match(/\(@([a-zA-Z0-9._]+)\)/);
  if (handleMatch && handleMatch[1]) usernames.add(handleMatch[1]);

  // 5. Look for "- username on" pattern (Classic OpenGraph)
  const descMatch1 = description.match(/- ([a-zA-Z0-9._]+) on /);
  if (descMatch1 && descMatch1[1]) usernames.add(descMatch1[1]);

  // 6. Title tag fallback if nothing else found
  if (usernames.size === 0) {
    const titleMatch = title.match(/(.+?) on Instagram/i);
    if (titleMatch && titleMatch[1]) usernames.add(titleMatch[1].trim().replace(/\s+/g, ''));
  }

  // Return array, filtering out any literal "unknown" strings just in case
  return Array.from(usernames).filter(u => u && u.toLowerCase() !== 'unknown');
};

/**
 * Parses the HTML to find the exact username, caption, and thumbnails from OpenGraph tags.
 */
const parseOpenGraphData = (html) => {
  const $ = cheerio.load(html);
  
  const description = $("meta[property='og:description']").attr("content") || $("meta[name='description']").attr("content") || "";
  const title = $("meta[property='og:title']").attr("content") || $("title").text() || "";
  const thumbnailUrl = $("meta[property='og:image']").attr("content") || "";
  const videoUrl = $("meta[property='og:video']").attr("content") || "";

  // Extract the array of usernames
  const usernames = extractAllUsernames(html, description, title);

  // Attempt to extract clean caption without the Instagram prefix
  let caption = description;
  const captionSplit = description.split(':"');
  if (captionSplit.length > 1) {
    caption = captionSplit.slice(1).join(':"').replace(/"$/, "").trim();
  }

  return { usernames, caption, thumbnailUrl, videoUrl };
};

/**
 * Deep Scraper: Navigates to the creator's profile to extract followers and last 7 reels' stats
 */
const fetchCreatorProfileStats = async (username) => {
  if (!username || username.toLowerCase() === "unknown") return null;

  try {
    const profileUrl = `https://www.instagram.com/${username}/`;
    const response = await axios.get(profileUrl, {
      headers: { "User-Agent": USER_AGENT },
      timeout: 6000,
    });

    const html = response.data;
    const $ = cheerio.load(html);
    const metaDesc = $("meta[property='og:description']").attr("content") || $("meta[name='description']").attr("content") || "";

    // 1. EXTRACT FOLLOWER COUNT (Checking multiple hidden JSON locations + fallbacks)
    let followersRaw = 0;
    const edgeFollowedMatch = html.match(/"edge_followed_by":\{"count":(\d+)\}/);
    const followerCountMatch = html.match(/"follower_count":(\d+)/);
    
    if (edgeFollowedMatch) {
      followersRaw = parseInt(edgeFollowedMatch[1], 10);
    } else if (followerCountMatch) {
      followersRaw = parseInt(followerCountMatch[1], 10);
    } else {
      const followerMatch = metaDesc.match(/([\d.,KMB]+)\s+Followers/i);
      if (followerMatch && followerMatch[1]) {
        followersRaw = parseCount(followerMatch[1]);
      }
    }
    
    // 2. EXTRACT REEL STATS (Searching raw JSON for views, likes, comments)
    const viewMatches = [...html.matchAll(/"(?:video_view_count|play_count)":(\d+)/g)].map(m => parseInt(m[1]));
    const likeMatches = [...html.matchAll(/"edge_media_preview_like":\{"count":(\d+)\}/g)].map(m => parseInt(m[1]));
    const commentMatches = [...html.matchAll(/"edge_media_to_comment":\{"count":(\d+)\}/g)].map(m => parseInt(m[1]));

    // Helper to calculate the average of the first 7 valid items
    const calculateAvg = (arr) => {
      const validNumbers = arr.filter(n => !isNaN(n) && n > 0);
      const recent = validNumbers.slice(0, 7);
      if (recent.length === 0) return 0;
      const sum = recent.reduce((a, b) => a + b, 0);
      return Math.floor(sum / recent.length);
    };

    return {
      followersRaw,
      avgViews: calculateAvg(viewMatches),
      avgLikes: calculateAvg(likeMatches),
      avgComments: calculateAvg(commentMatches)
    };
  } catch (error) {
    console.warn(`⚠️ [Scraper] Failed to fetch deep profile stats for @${username}:`, error.message);
    return null;
  }
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

    const html = response.data;
    const ogData = parseOpenGraphData(html);

    return {
      url: cleanUrl,
      usernames: ogData.usernames,
      thumbnailUrl: ogData.thumbnailUrl,
      caption: ogData.caption
    };
  } catch (error) {
    console.warn(`⚠️ [Scraper] Fast extract failed for ${cleanUrl}. Applying fallback.`);
    
    return {
      url: cleanUrl,
      usernames: [], 
      thumbnailUrl: "",
      caption: ""
    };
  }
};

/**
 * 2. Deep extraction for the AI Engine
 * Attempts to pull the direct MP4 stream or high-res thumbnail for Gemini Vision.
 */
export const fetchFullReelMedia = async (reelUrl, specificUsername = "") => {
  const cleanUrl = cleanInstagramUrl(reelUrl);
  
  try {
    const response = await axios.get(cleanUrl, {
      headers: { "User-Agent": USER_AGENT },
      timeout: 8000, 
    });

    const html = response.data;
    const ogData = parseOpenGraphData(html);
    
    // Ensure we use the best available username (prioritize the specific collaborator)
    const trueUsername = specificUsername || (ogData.usernames.length > 0 ? ogData.usernames[0] : "");
    let finalCaption = ogData.caption;
    
    // Only attempt a deep scrape if we successfully found a valid username
    if (trueUsername && trueUsername.toLowerCase() !== 'unknown') {
      const profileStats = await fetchCreatorProfileStats(trueUsername);
      
      if (profileStats) {
        // Inject the scraped stats directly into the caption context so the AI can format it perfectly
        finalCaption += `\n\n[SYSTEM - Deep Scrape Data]:
        - True Username: ${trueUsername}
        - Total Followers: ${profileStats.followersRaw}
        - Last 7 Reels Avg Views: ${profileStats.avgViews}
        - Last 7 Reels Avg Likes: ${profileStats.avgLikes}
        - Last 7 Reels Avg Comments: ${profileStats.avgComments}`;
      }
    }

    return {
      url: cleanUrl,
      username: trueUsername,
      caption: finalCaption,
      thumbnailUrl: ogData.thumbnailUrl,
      videoUrl: ogData.videoUrl || ogData.thumbnailUrl 
    };
  } catch (error) {
    console.error(`❌ [Scraper] Deep media fetch failed for ${cleanUrl}:`, error.message);
    
    return {
      url: cleanUrl,
      username: specificUsername || "",
      caption: "",
      thumbnailUrl: "",
      videoUrl: ""
    };
  }
};