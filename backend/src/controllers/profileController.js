import * as profileService from "../services/profileService.js";
import { db } from "../config/firebase.js"; // Injected to safely handle DB calls natively

// Instagram handles: letters, numbers, periods, underscores, max 30 chars
const HANDLE_REGEX = /^[A-Za-z0-9._]{1,30}$/;

// Fields clients must never be able to overwrite through PATCH/POST
const PROTECTED_FIELDS = ["id", "createdAt", "updatedAt"];

const NUMERIC_FIELDS = ["totalFollowers", "avgViewsPerWeek", "avgLikes", "avgComments"];
const TRIMMED_STRING_FIELDS = ["contact", "nation", "skinTone", "bodyType", "reelType", "specialPart", "ageRange", "status", "notes", "category"];

const MAX_MASS_UPLOAD_ITEMS = 5000;
const MAX_MASS_UPLOAD_CHARS = 500000;

const extractCleanUsername = (raw) => {
  if (!raw || typeof raw !== "string") return "";
  let clean = raw.trim();

  if (clean.includes("instagram.com/")) {
    try {
      const urlObj = new URL(clean.startsWith("http") ? clean : `https://${clean}`);
      const segments = urlObj.pathname.split("/").filter(Boolean);

      if (segments.length === 0) return "";

      const first = segments[0];
      if (first === "stories") {
        // instagram.com/stories/<username>/<id>
        clean = segments[1] || "";
      } else if (first === "reel" || first === "reels" || first === "p" || first === "tv") {
        // A post/reel link doesn't contain the account handle. It used to leak through
        // as a "username" containing the whole URL.
        return "";
      } else {
        clean = first;
      }
    } catch {
      return "";
    }
  }

  clean = clean.replace(/^@+/, "").trim();
  return clean;
};

const isValidHandle = (handle) => HANDLE_REGEX.test(handle);

const toCount = (value) => Math.max(0, parseInt(value, 10) || 0);

const sanitizeProfileData = (data = {}) => {
  const sanitized = { ...data };

  // Never let the client set server-managed fields (mass-assignment protection)
  PROTECTED_FIELDS.forEach((field) => delete sanitized[field]);

  if (typeof sanitized.username === "string") {
    sanitized.username = extractCleanUsername(sanitized.username);
  }

  // avgLikes / avgComments were previously not sanitized at all
  NUMERIC_FIELDS.forEach((field) => {
    if (sanitized[field] !== undefined) {
      sanitized[field] = toCount(sanitized[field]);
    }
  });

  if (sanitized.playable !== undefined) {
    sanitized.playable = sanitized.playable === true || sanitized.playable === "true";
  }

  TRIMMED_STRING_FIELDS.forEach((field) => {
    if (typeof sanitized[field] === "string") {
      sanitized[field] = sanitized[field].trim();
    }
  });

  return sanitized;
};

// Firestore Timestamps serialize to { _seconds, _nanoseconds }, which breaks sorting and
// date display on the frontend. Convert them to ISO strings.
const serializeDoc = (doc) => {
  const out = {};
  for (const [key, value] of Object.entries(doc.data())) {
    out[key] = value && typeof value.toDate === "function" ? value.toDate().toISOString() : value;
  }
  return { ...out, id: doc.id }; // doc id always wins
};

const noCache = (res) => res.set("Cache-Control", "no-store");

export const checkProfile = async (req, res) => {
  try {
    const { username } = req.body || {};
    if (!username || typeof username !== "string" || !username.trim()) {
      return res.status(400).json({ success: false, error: "A valid username or URL is required." });
    }

    const cleanUsername = extractCleanUsername(username);
    if (!cleanUsername || !isValidHandle(cleanUsername)) {
      return res.status(400).json({ success: false, error: "Unable to extract a valid username handle." });
    }

    const exists = await profileService.checkProfileExists(cleanUsername);
    return res.status(200).json({ success: true, username: cleanUsername, exists });
  } catch (error) {
    console.error("Error checking profile:", error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
};

export const addProfile = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({ success: false, error: "Request body cannot be empty." });
    }

    const sanitizedData = sanitizeProfileData(req.body);

    if (!sanitizedData.username || !isValidHandle(sanitizedData.username)) {
      return res.status(400).json({ success: false, error: "Valid username is required." });
    }

    const newProfile = await profileService.addProfile(sanitizedData);
    return res.status(201).json({ success: true, message: "Profile added successfully.", profile: newProfile });
  } catch (error) {
    console.error("Error adding profile:", error);
    if (error.message === "Profile already exists.") {
      return res.status(409).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
};

// Returns the full collection so "Copy All" captures everything.
// NOTE: combining where("category") with orderBy("createdAt") needs a Firestore composite
// index; if the category filter returns a 500, the error log contains a link to create it.
// Also note: Firestore's orderBy silently excludes documents that have no createdAt field.
export const getProfiles = async (req, res) => {
  try {
    const category = typeof req.query.category === "string" ? req.query.category : "";

    let query = db.collection("profiles");

    if (category) {
      query = query.where("category", "==", category);
    }

    query = query.orderBy("createdAt", "desc");

    const snapshot = await query.get();
    const profiles = snapshot.docs.map(serializeDoc);

    noCache(res); // avoid stale lists coming back as 304s after edits
    return res.status(200).json({
      success: true,
      data: profiles
    });
  } catch (error) {
    console.error("Error fetching profiles:", error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
};

// True Firestore aggregation (counts without reading every document)
export const getGlobalCount = async (req, res) => {
  try {
    const snapshot = await db.collection("profiles").count().get();
    const count = snapshot.data().count;

    noCache(res);
    return res.status(200).json({
      success: true,
      count: count
    });
  } catch (error) {
    console.error("Error fetching global profile count:", error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const profileId = req.params.id;
    const updateData = req.body;

    if (!profileId || typeof profileId !== "string" || !profileId.trim()) {
      return res.status(400).json({ success: false, error: "Valid profile ID is required." });
    }

    if (!updateData || typeof updateData !== "object" || Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, error: "Update payload cannot be empty." });
    }

    const sanitizedUpdate = sanitizeProfileData(updateData);

    // If a username was sent, it must still be valid after cleaning (previously a
    // junk value could blank out or corrupt the username).
    if ("username" in sanitizedUpdate && !isValidHandle(sanitizedUpdate.username || "")) {
      return res.status(400).json({ success: false, error: "Valid username is required." });
    }

    if (Object.keys(sanitizedUpdate).length === 0) {
      return res.status(400).json({ success: false, error: "No updatable fields provided." });
    }

    const updatedProfile = await profileService.updateProfile(profileId.trim(), sanitizedUpdate);

    return res.status(200).json({ success: true, message: "Profile updated successfully.", profile: updatedProfile });
  } catch (error) {
    console.error("Error updating profile:", error);
    if (error.message === "Profile not found.") {
      return res.status(404).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
};

export const deleteProfile = async (req, res) => {
  try {
    const profileId = req.params.id;
    if (!profileId || typeof profileId !== "string" || !profileId.trim()) {
      return res.status(400).json({ success: false, error: "Valid profile ID is required." });
    }

    await profileService.deleteProfile(profileId.trim());
    return res.status(200).json({ success: true, message: "Profile deleted successfully." });
  } catch (error) {
    console.error("Error deleting profile:", error);
    if (error.message === "Profile not found.") {
      return res.status(404).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
};

export const massUpload = async (req, res) => {
  try {
    const { usernames } = req.body || {};
    if (!usernames || (typeof usernames !== "string" && !Array.isArray(usernames))) {
      return res.status(400).json({ success: false, error: "Usernames string or list is required." });
    }

    // Guard against enormous payloads
    if (Array.isArray(usernames) && usernames.length > MAX_MASS_UPLOAD_ITEMS) {
      return res.status(413).json({ success: false, error: `Maximum ${MAX_MASS_UPLOAD_ITEMS} usernames per upload.` });
    }
    if (typeof usernames === "string" && usernames.length > MAX_MASS_UPLOAD_CHARS) {
      return res.status(413).json({ success: false, error: "Upload text is too large." });
    }

    const result = await profileService.massUploadProfiles(usernames);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error("Error in mass upload:", error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
};

export const refreshVideos = async (req, res) => {
  try {
    const { ids, force } = req.body;
    
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ success: false, error: "An array of IDs is required." });
    }

    // Calls your service to handle the actual refresh logic
    const result = await profileService.refreshVideos(ids, force); 
    
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Error refreshing videos:", error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
};