import * as profileService from "../services/profileService.js";

// Helper function to extract and sanitize a clean username from raw strings or URLs
const extractCleanUsername = (raw) => {
  if (!raw || typeof raw !== "string") return "";
  let clean = raw.trim();

  // If a full Instagram URL was pasted, parse the username/path
  if (clean.includes("instagram.com/")) {
    try {
      const urlObj = new URL(clean.startsWith("http") ? clean : `https://${clean}`);
      const segments = urlObj.pathname.split("/").filter(Boolean);
      // If it's a profile URL (e.g. instagram.com/username/)
      if (segments.length > 0 && segments[0] !== "reel" && segments[0] !== "p" && segments[0] !== "stories") {
        clean = segments[0];
      }
    } catch {
      // Fallback if URL parsing fails
    }
  }

  // Remove leading @ and unwanted punctuation/spaces
  clean = clean.replace(/^@+/, "").trim();
  return clean;
};

// Helper function to sanitize profile payloads
const sanitizeProfileData = (data = {}) => {
  const sanitized = { ...data };

  if (sanitized.username) {
    sanitized.username = extractCleanUsername(sanitized.username);
  }

  // Numeric sanity checks: Prevent negative counts or NaN
  if (sanitized.totalFollowers !== undefined) {
    sanitized.totalFollowers = Math.max(0, parseInt(sanitized.totalFollowers, 10) || 0);
  }
  if (sanitized.avgViewsPerWeek !== undefined) {
    sanitized.avgViewsPerWeek = Math.max(0, parseInt(sanitized.avgViewsPerWeek, 10) || 0);
  }

  // String trimming
  ["nation", "skinTone", "bodyType", "reelType", "specialPart", "ageRange", "status", "notes"].forEach((field) => {
    if (typeof sanitized[field] === "string") {
      sanitized[field] = sanitized[field].trim();
    }
  });

  return sanitized;
};

export const checkProfile = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || typeof username !== "string" || !username.trim()) {
      return res.status(400).json({
        success: false,
        error: "A valid username or URL is required."
      });
    }

    const cleanUsername = extractCleanUsername(username);
    if (!cleanUsername) {
      return res.status(400).json({
        success: false,
        error: "Unable to extract a valid username handle."
      });
    }

    const exists = await profileService.checkProfileExists(cleanUsername);
    return res.status(200).json({
      success: true,
      username: cleanUsername,
      exists
    });
  } catch (error) {
    console.error("Error checking profile:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error."
    });
  }
};

export const addProfile = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({
        success: false,
        error: "Request body cannot be empty."
      });
    }

    const sanitizedData = sanitizeProfileData(req.body);

    if (!sanitizedData.username) {
      return res.status(400).json({
        success: false,
        error: "Valid username is required."
      });
    }

    const newProfile = await profileService.addProfile(sanitizedData);
    return res.status(201).json({
      success: true,
      message: "Profile added successfully.",
      profile: newProfile
    });
  } catch (error) {
    console.error("Error adding profile:", error);
    if (error.message === "Profile already exists.") {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }
    return res.status(500).json({
      success: false,
      error: "Internal server error."
    });
  }
};

export const getProfiles = async (req, res) => {
  try {
    const profiles = await profileService.getProfiles();
    return res.status(200).json(profiles);
  } catch (error) {
    console.error("Error fetching profiles:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error."
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const profileId = req.params.id;
    const updateData = req.body;

    if (!profileId || typeof profileId !== "string" || !profileId.trim()) {
      return res.status(400).json({
        success: false,
        error: "Valid profile ID is required."
      });
    }

    if (!updateData || typeof updateData !== "object" || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: "Update payload cannot be empty."
      });
    }

    const sanitizedUpdate = sanitizeProfileData(updateData);
    const updatedProfile = await profileService.updateProfile(profileId.trim(), sanitizedUpdate);

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      profile: updatedProfile
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    if (error.message === "Profile not found.") {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    return res.status(500).json({
      success: false,
      error: "Internal server error."
    });
  }
};

export const deleteProfile = async (req, res) => {
  try {
    const profileId = req.params.id;
    if (!profileId || typeof profileId !== "string" || !profileId.trim()) {
      return res.status(400).json({
        success: false,
        error: "Valid profile ID is required."
      });
    }

    await profileService.deleteProfile(profileId.trim());
    return res.status(200).json({
      success: true,
      message: "Profile deleted successfully."
    });
  } catch (error) {
    console.error("Error deleting profile:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error."
    });
  }
};

export const massUpload = async (req, res) => {
  try {
    const { usernames } = req.body;
    if (!usernames || (typeof usernames !== "string" && !Array.isArray(usernames))) {
      return res.status(400).json({
        success: false,
        error: "Usernames string or list is required."
      });
    }

    const result = await profileService.massUploadProfiles(usernames);
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error("Error in mass upload:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error."
    });
  }
};