import * as profileService from '../services/profileService.js';

export const checkProfile = async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ error: "Username is required." });
        }

        const exists = await profileService.checkProfileExists(username);
        res.status(200).json({ exists });
    } catch (error) {
        console.error("Error checking profile:", error);
        res.status(500).json({ error: "Internal server error." });
    }
};

export const addProfile = async (req, res) => {
    try {
        // req.body contains all the new fields (skinTone, bodyType, avgViewsPerWeek, etc.)
        const newProfile = await profileService.addProfile(req.body);
        res.status(201).json({ message: "Profile added successfully", profile: newProfile });
    } catch (error) {
        console.error("Error adding profile:", error);
        if (error.message === 'Profile already exists.') {
            return res.status(409).json({ error: error.message });
        }
        res.status(500).json({ error: "Internal server error." });
    }
};

export const getProfiles = async (req, res) => {
    try {
        const profiles = await profileService.getProfiles();
        res.status(200).json(profiles);
    } catch (error) {
        console.error("Error fetching profiles:", error);
        res.status(500).json({ error: "Internal server error." });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const profileId = req.params.id;
        const updateData = req.body;

        if (!profileId) {
            return res.status(400).json({ error: "Profile ID is required." });
        }

        const updatedProfile = await profileService.updateProfile(profileId, updateData);
        res.status(200).json({ message: "Profile updated successfully", profile: updatedProfile });
    } catch (error) {
        console.error("Error updating profile:", error);
        if (error.message === 'Profile not found.') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: "Internal server error." });
    }
};

export const deleteProfile = async (req, res) => {
    try {
        const profileId = req.params.id;
        if (!profileId) {
            return res.status(400).json({ error: "Profile ID is required." });
        }

        await profileService.deleteProfile(profileId);
        res.status(200).json({ message: "Profile deleted successfully." });
    } catch (error) {
        console.error("Error deleting profile:", error);
        res.status(500).json({ error: "Internal server error." });
    }
};
export const massUpload = async (req, res) => {
    try {
        const { usernames } = req.body;
        if (!usernames) {
            return res.status(400).json({ error: "Usernames string is required." });
        }

        const result = await profileService.massUploadProfiles(usernames);
        res.status(200).json(result);
    } catch (error) {
        console.error("Error in mass upload:", error);
        res.status(500).json({ error: "Internal server error." });
    }
};