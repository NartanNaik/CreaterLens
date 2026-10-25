import axios from "axios";

// Two ways to read a reel, tried in this order:
//   1. RapidAPI (only if RAPIDAPI_KEY is set): the most reliable, but paid/limited.
//   2. Instagram's public embed page (no key needed): gives the username, caption and thumbnail when
//      Instagram allows the request. Instagram sometimes blocks server (datacenter) traffic, so this is best-effort.
const RAPID_API_KEY = process.env.RAPIDAPI_KEY || "";
const RAPID_API_HOST = process.env.RAPIDAPI_HOST || "instagram-scraper-api2.p.rapidapi.com";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const RESERVED_PATHS = ["p", "reel", "reels", "tv", "stories", "explore"];

// 1. URL cleaner: strips mobile `igsh` tracking tags and trailing slashes
const cleanInstagramUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  try {
    const parsed = new URL(rawUrl.trim());
    return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, "");
  } catch {
    return rawUrl.split("?")[0].trim().replace(/\/$/, "");
  }
};

// 2. If the link itself contains the handle (instagram.com/<user>/reel/<code>), take it from there.
const attemptFallbackUsername = (url) => {
  const profileMatch = url.match(/(?:instagram\.com|instagr\.am)\/([A-Za-z0-9_.]+)/);
  if (profileMatch && !RESERVED_PATHS.includes(profileMatch[1].toLowerCase())) {
    return profileMatch[1];
  }
  return "Unknown";
};

const decodeHtml = (text) =>
  String(text || "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(parseInt(num, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

const HANDLE_OK = /^[A-Za-z0-9._]{1,30}$/;

/**
 * Keyless read of the public embed page. Returns { username, caption, thumbnailUrl }; any field can be "".
 * Never throws: on any failure it returns empty values.
 */
const scrapeEmbed = async (cleanUrl) => {
  const empty = { username: "", caption: "", thumbnailUrl: "" };
  if (!/instagram\.com\/(?:reel|reels|p|tv)\/[A-Za-z0-9_-]+/i.test(cleanUrl)) return empty;

  try {
    const response = await axios.get(`${cleanUrl}/embed/captioned/`, {
      timeout: 5000,
      maxContentLength: 2 * 1024 * 1024,
      responseType: "text",
      headers: { "User-Agent": BROWSER_UA, "Accept-Language": "en-US,en;q=0.9" },
      validateStatus: (status) => status === 200
    });

    const html = String(response.data || "");

    // Username
    let username = "";
    const userMatch =
      /class="UsernameText"[^>]*>([^<]+)</i.exec(html) ||
      /class="CaptionUsername"[^>]*>([^<]+)</i.exec(html) ||
      /\\?"username\\?":\s*\\?"([A-Za-z0-9._]{1,30})\\?"/.exec(html);
    if (userMatch) {
      const candidate = decodeHtml(userMatch[1]).trim().replace(/^@/, "");
      if (HANDLE_OK.test(candidate)) username = candidate;
    }

    // Caption: the text block next to the username
    let caption = "";
    const capMatch =
      /<div class="Caption">([\s\S]*?)<div class="CaptionComments">/i.exec(html) ||
      /<div class="Caption">([\s\S]*?)<\/div>/i.exec(html);
    if (capMatch) {
      caption = decodeHtml(
        capMatch[1]
          .replace(/<a[^>]*class="CaptionUsername"[^>]*>[\s\S]*?<\/a>/i, "")
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<[^>]+>/g, "")
      ).trim();
    }

    // Thumbnail
    let thumbnailUrl = "";
    const imgMatch = /class="EmbeddedMediaImage"[^>]*\ssrc="([^"]+)"/i.exec(html) ||
      /<img[^>]*\ssrc="([^"]+)"[^>]*class="EmbeddedMediaImage"/i.exec(html);
    if (imgMatch) thumbnailUrl = decodeHtml(imgMatch[1]);

    return { username, caption, thumbnailUrl };
  } catch {
    return empty;
  }
};

const callRapidApi = (cleanUrl, timeout) =>
  axios.get(`https://${RAPID_API_HOST}/v1/post_info`, {
    params: { code_or_id_or_url: cleanUrl },
    headers: {
      "X-RapidAPI-Key": RAPID_API_KEY,
      "X-RapidAPI-Host": RAPID_API_HOST
    },
    timeout
  });

/**
 * 1. Fast extraction for the Staging Queue (share from the app)
 */
export const extractBasicInfo = async (reelUrl) => {
  const cleanUrl = cleanInstagramUrl(reelUrl);
  const fallbackUser = attemptFallbackUsername(cleanUrl);

  if (RAPID_API_KEY) {
    try {
      const response = await callRapidApi(cleanUrl, 4000);
      const data = response.data?.data || {};
      const username = data.user?.username || fallbackUser;

      return {
        url: cleanUrl,
        usernames: username !== "Unknown" ? [username] : [],
        thumbnailUrl: data.thumbnail_url || "",
        caption: data.caption?.text || ""
      };
    } catch {
      console.warn(`[Scraper] RapidAPI failed for ${cleanUrl}, trying the public embed page.`);
    }
  }

  const embed = await scrapeEmbed(cleanUrl);
  const username = embed.username || (fallbackUser !== "Unknown" ? fallbackUser : "");

  if (!username && !embed.caption && !embed.thumbnailUrl) {
    console.warn(`[Scraper] Could not read ${cleanUrl} (no key, and the embed page gave nothing).`);
  }

  return {
    url: cleanUrl,
    usernames: username ? [username] : [],
    thumbnailUrl: embed.thumbnailUrl,
    caption: embed.caption
  };
};

/**
 * 2. Deep extraction for the AI Engine
 */
export const fetchFullReelMedia = async (reelUrl, specificUsername = "") => {
  const cleanUrl = cleanInstagramUrl(reelUrl);
  const hasGivenName = specificUsername && !/^unknown$/i.test(specificUsername);
  const fallbackUser = hasGivenName ? specificUsername : attemptFallbackUsername(cleanUrl);

  if (RAPID_API_KEY) {
    try {
      const response = await callRapidApi(cleanUrl, 6000);
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
      console.error("[Scraper] RapidAPI deep fetch failed:", error.message);
    }
  }

  const embed = await scrapeEmbed(cleanUrl);

  return {
    url: cleanUrl,
    username: embed.username || (fallbackUser !== "Unknown" ? fallbackUser : ""),
    caption: embed.caption,
    thumbnailUrl: embed.thumbnailUrl,
    videoUrl: ""
  };
};