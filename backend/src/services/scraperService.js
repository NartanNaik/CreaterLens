import axios from "axios";

// Two ways to read a reel, tried in this order:
//   1. RapidAPI (only if RAPIDAPI_KEY is set): the most reliable, but paid/limited.
//   2. Instagram's public embed page (no key needed): gives the username, caption and thumbnail when
//      Instagram allows the request. Instagram sometimes blocks server (datacenter) traffic, so this is best-effort.
const RAPID_API_KEY = process.env.RAPIDAPI_KEY || "";
const RAPID_API_HOST = process.env.RAPIDAPI_HOST || "instagram-scraper-stable-api.p.rapidapi.com";
const IS_STABLE_API = /stable-api/i.test(RAPID_API_HOST);

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

// ---- RapidAPI ----
// Walks any JSON reply and returns the first value found under one of the given key names.
const deepFind = (node, keys, depth = 0) => {
  if (!node || typeof node !== "object" || depth > 6) return undefined;
  for (const key of keys) {
    if (node[key] !== undefined && node[key] !== null && node[key] !== "") return node[key];
  }
  for (const value of Object.values(node)) {
    const found = deepFind(value, keys, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
};

// Different RapidAPI Instagram services name things differently; read the common shapes.
const readPost = (data) => {
  const ownerObj = deepFind(data, ["owner", "user"]);
  const username = (ownerObj && typeof ownerObj === "object" ? ownerObj.username : "") || deepFind(data, ["username"]) || "";

  let caption = deepFind(data, ["caption"]);
  if (caption && typeof caption === "object") caption = caption.text || "";
  if (!caption) {
    const edges = deepFind(data, ["edge_media_to_caption"]);
    caption = edges?.edges?.[0]?.node?.text || "";
  }

  const candidates = deepFind(data, ["candidates"]);
  const thumbnail =
    deepFind(data, ["thumbnail_url", "thumbnail_src", "display_url"]) ||
    (Array.isArray(candidates) ? candidates[0]?.url : "") ||
    "";

  const video = deepFind(data, ["video_url"]) || "";
  const followers = ownerObj && typeof ownerObj === "object" ? ownerObj.follower_count : undefined;

  return {
    username: typeof username === "string" ? username : "",
    caption: typeof caption === "string" ? caption : "",
    thumbnailUrl: typeof thumbnail === "string" ? thumbnail : "",
    videoUrl: typeof video === "string" ? video : "",
    followers,
    likes: deepFind(data, ["like_count"]),
    comments: deepFind(data, ["comment_count"]),
    views: deepFind(data, ["view_count", "play_count", "video_view_count"])
  };
};

const callRapidApi = async (cleanUrl, timeout) => {
  const headers = {
    "X-RapidAPI-Key": RAPID_API_KEY,
    "X-RapidAPI-Host": RAPID_API_HOST
  };

  let response;
  if (IS_STABLE_API) {
    // "Instagram Scraper Stable API": POST /get_media_data.php with a form body
    const body = new URLSearchParams({
      reel_post_code_or_url: cleanUrl,
      type: /\/(?:reel|reels|tv)\//i.test(cleanUrl) ? "reel" : "post"
    });
    response = await axios.post(`https://${RAPID_API_HOST}/get_media_data.php`, body.toString(), {
      headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
      timeout
    });
  } else {
    // Older "Instagram Scraper API 2" style
    response = await axios.get(`https://${RAPID_API_HOST}/v1/post_info`, {
      params: { code_or_id_or_url: cleanUrl },
      headers,
      timeout
    });
  }

  const post = readPost(response.data?.data || response.data || {});

  if (!post.username && !post.caption && !post.thumbnailUrl) {
    // Reached the API but could not read anything: log the reply's shape so the mapping can be fixed.
    const keys = Object.keys(response.data || {}).slice(0, 12).join(", ");
    console.warn(`[Scraper] RapidAPI reply had no username/caption/thumbnail. Top-level keys: ${keys}`);
  }

  return post;
};

/**
 * 1. Fast extraction for the Staging Queue (share from the app)
 */
export const extractBasicInfo = async (reelUrl) => {
  const cleanUrl = cleanInstagramUrl(reelUrl);
  const fallbackUser = attemptFallbackUsername(cleanUrl);

  if (RAPID_API_KEY) {
    try {
      const post = await callRapidApi(cleanUrl, 8000);
      const username = post.username || (fallbackUser !== "Unknown" ? fallbackUser : "");

      if (username || post.caption || post.thumbnailUrl) {
        return {
          url: cleanUrl,
          usernames: username ? [username] : [],
          thumbnailUrl: post.thumbnailUrl,
          caption: post.caption
        };
      }
    } catch (error) {
      console.warn(`[Scraper] RapidAPI failed for ${cleanUrl} (${error.response?.status || error.message}), trying the public embed page.`);
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
      const post = await callRapidApi(cleanUrl, 10000);
      const trueUsername = post.username || (fallbackUser !== "Unknown" ? fallbackUser : "");

      if (trueUsername || post.caption || post.thumbnailUrl) {
        let finalCaption = post.caption || "";

        if (post.followers !== undefined || post.likes !== undefined || post.views !== undefined) {
          finalCaption += `\n\n[SYSTEM - Deep Scrape Data]:
        - True Username: ${trueUsername || "Unknown"}
        - Total Followers: ${post.followers ?? "Unknown"}
        - Post Likes: ${post.likes ?? 0}
        - Post Comments: ${post.comments ?? 0}
        - Post Views: ${post.views ?? 0}`;
        }

        return {
          url: cleanUrl,
          username: trueUsername,
          caption: finalCaption,
          thumbnailUrl: post.thumbnailUrl,
          videoUrl: post.videoUrl || post.thumbnailUrl
        };
      }
    } catch (error) {
      console.error(`[Scraper] RapidAPI deep fetch failed (${error.response?.status || error.message}).`);
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