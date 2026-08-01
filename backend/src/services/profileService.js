import { db } from '../config/firebase.js';

// We are now targeting the new 'profiles' collection
const profilesCollection = db.collection('profiles');

/**
 * 1. The Uniqueness Checker
 * Checks if a profile already exists in the database.
 */
export const checkProfileExists = async (username) => {
    const normalized = username.toLowerCase().trim();
    const snapshot = await profilesCollection.where('normalizedUsername', '==', normalized).get();
    return !snapshot.empty;
};

/**
 * 2. The Insertion Logic
 * Creates a new profile with the specific fields required for the new system.
 */
export const addProfile = async (profileData) => {
    const normalizedUsername = profileData.username.toLowerCase().trim();
    
    // Double-check to prevent race conditions during insertion
    const exists = await checkProfileExists(normalizedUsername);
    if (exists) {
        throw new Error('Profile already exists.');
    }

    const newProfile = {
        username: profileData.username.trim(),
        normalizedUsername,
        nation: profileData.nation || '',
        skinTone: profileData.skinTone || '',
        bodyType: profileData.bodyType || '',
        reelType: profileData.reelType || '',
        specialPart: profileData.specialPart || '',
        ageRange: profileData.ageRange || '',
        playable: profileData.playable || false,
        totalFollowers: Number(profileData.totalFollowers) || 0,
        avgViewsPerWeek: Number(profileData.avgViewsPerWeek) || 0,
        customCategories: profileData.customCategories || {},
        createdAt: new Date().toISOString() // Using standard ISO-8601 strings
    };

    const docRef = await profilesCollection.add(newProfile);
    return { id: docRef.id, ...newProfile };
};

/**
 * 3. The Fetch Logic
 * Retrieves all profiles to populate the frontend table.
 */
export const getProfiles = async () => {
    const snapshot = await profilesCollection.get();
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

/**
 * 4. The Update Logic
 * Updates specific fields of an existing profile (e.g., avgViewsPerWeek or custom categories).
 */
export const updateProfile = async (profileId, updateData) => {
    const docRef = profilesCollection.doc(profileId);
    
    // Check if the document actually exists before updating
    const doc = await docRef.get();
    if (!doc.exists) {
        throw new Error('Profile not found.');
    }

    // Perform a partial update
    await docRef.update(updateData);
    
    return { id: profileId, ...updateData };
};

/**
 * 5. The Delete Logic
 * Removes a specific profile from the database by its ID.
 */
export const deleteProfile = async (profileId) => {
    await profilesCollection.doc(profileId).delete();
    return true;
};

/**
 * 6. Mass Upload Logic
 * Efficiently processes bulk uploads using in-memory Sets and batched Firestore writes.
 */
export const massUploadProfiles = async (usernamesString) => {
    // 1. Split string by newlines, trim, and remove internal duplicates
    const rawNames = usernamesString.split('\n').map(name => name.trim()).filter(Boolean);
    const uniqueInputNames = [...new Set(rawNames)];

    // 2. Fetch all existing normalized usernames to prevent an O(N) database read waterfall
    const snapshot = await profilesCollection.select('normalizedUsername').get();
    const existingUsernames = new Set(snapshot.docs.map(doc => doc.data().normalizedUsername));

    // 3. Filter out names that already exist in the database
    const newNames = uniqueInputNames.filter(name => !existingUsernames.has(name.toLowerCase()));

    // 4. Chunk inserts into batches (Firestore limit is 500 per batch)
    const addedProfiles = [];
    let currentBatch = db.batch();
    let operationCount = 0;
    const batchPromises = [];

    for (const username of newNames) {
        const docRef = profilesCollection.doc(); // Generate a new ID
        const profileData = {
            username,
            normalizedUsername: username.toLowerCase(),
            nation: '', skinTone: 'Fair', bodyType: 'Fit', reelType: 'Hot',
            specialPart: 'Whole body', ageRange: '18 to 28', playable: false,
            totalFollowers: 0, avgViewsPerWeek: 0, customCategories: {},
            createdAt: new Date().toISOString()
        };

        currentBatch.set(docRef, profileData);
        addedProfiles.push({ id: docRef.id, ...profileData });
        operationCount++;

        // Commit and reset batch if we near the 500 limit
        if (operationCount === 490) {
            batchPromises.push(currentBatch.commit());
            currentBatch = db.batch();
            operationCount = 0;
        }
    }

    // Commit any remaining operations
    if (operationCount > 0) {
        batchPromises.push(currentBatch.commit());
    }

    await Promise.all(batchPromises);

    return {
        totalSubmitted: rawNames.length,
        added: addedProfiles.length,
        skipped: rawNames.length - addedProfiles.length,
        newProfiles: addedProfiles
    };
};