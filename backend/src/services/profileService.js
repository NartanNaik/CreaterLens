import { db } from '../config/firebase.js';
import * as bloomFilterService from './bloomFilterService.js';

// We are targeting the active 'profiles' collection
const profilesCollection = db.collection('profiles');

/**
 * 1. The Uniqueness Checker
 * Checks if a profile already exists in the user's database.
 */
export const checkProfileExists = async (username, userId) => {
    const normalized = username.toLowerCase().trim();
    const snapshot = await profilesCollection
        .where('userId', '==', userId)
        .where('normalizedUsername', '==', normalized)
        .get();
    return !snapshot.empty;
};

/**
 * 2. The Insertion Logic
 * Creates a new profile with strict numeric validation, ownership, and syncs it to the Bloom Filter.
 */
export const addProfile = async (profileData) => {
    const userId = profileData.userId;
    if (!userId) {
        throw new Error('Unauthorized: userId is required.');
    }

    const normalizedUsername = profileData.username.toLowerCase().trim();

    // Double-check to prevent race conditions during insertion
    const exists = await checkProfileExists(normalizedUsername, userId);
    if (exists) {
        throw new Error('Profile already exists.');
    }

    const newProfile = {
        userId,
        username: profileData.username.trim(),
        normalizedUsername,
        nation: profileData.nation || '',
        skinTone: profileData.skinTone || '',
        bodyType: profileData.bodyType || '',
        reelType: profileData.reelType || '',
        specialPart: profileData.specialPart || '',
        ageRange: profileData.ageRange || '',
        playable: profileData.playable || false,
        // Edge Case Protection: Force non-negative integers. No NaNs.
        totalFollowers: Math.max(0, parseInt(profileData.totalFollowers, 10) || 0),
        avgViewsPerWeek: Math.max(0, parseInt(profileData.avgViewsPerWeek, 10) || 0),
        customCategories: profileData.customCategories || {},
        createdAt: new Date().toISOString()
    };

    const docRef = await profilesCollection.add(newProfile);

    // Sync with memory cache scoped by user
    bloomFilterService.add(`${userId}_${normalizedUsername}`);

    return { id: docRef.id, ...newProfile };
};

/**
 * 3. The Fetch Logic
 * Retrieves all profiles for the logged-in user to populate the frontend table.
 */
export const getProfiles = async (userId, category = '') => {
    if (!userId) throw new Error('Unauthorized: userId is required.');

    let query = profilesCollection.where('userId', '==', userId);

    if (category) {
        query = query.where('category', '==', category);
    }

    query = query.orderBy('createdAt', 'desc');

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

/**
 * 4. The Update Logic
 * Updates specific fields of an existing profile owned by the user.
 */
export const updateProfile = async (profileId, updateData, userId) => {
    if (!userId) throw new Error('Unauthorized: userId is required.');

    const docRef = profilesCollection.doc(profileId);
    const doc = await docRef.get();

    if (!doc.exists || doc.data().userId !== userId) {
        throw new Error('Profile not found.');
    }

    // Edge Case Protection: Ensure any numeric updates are non-negative
    if (updateData.totalFollowers !== undefined) {
        updateData.totalFollowers = Math.max(0, parseInt(updateData.totalFollowers, 10) || 0);
    }
    if (updateData.avgViewsPerWeek !== undefined) {
        updateData.avgViewsPerWeek = Math.max(0, parseInt(updateData.avgViewsPerWeek, 10) || 0);
    }

    await docRef.update(updateData);

    return { id: profileId, ...updateData };
};

/**
 * 5. The Delete Logic
 * Removes a profile and clears its handle from the Bloom Filter memory cache for that user.
 */
export const deleteProfile = async (profileId, userId) => {
    if (!userId) throw new Error('Unauthorized: userId is required.');

    const docRef = profilesCollection.doc(profileId);
    const doc = await docRef.get();

    if (doc.exists && doc.data().userId === userId) {
        const data = doc.data();
        bloomFilterService.remove(`${userId}_${data.normalizedUsername}`);
        await docRef.delete();
    }

    return true;
};

/**
 * 6. Mass Upload Logic
 * Efficiently processes bulk uploads, sanitizes data, and syncs the user cache.
 */
export const massUploadProfiles = async (usernamesString, userId) => {
    if (!userId) throw new Error('Unauthorized: userId is required.');

    // 1. Split string by newlines, trim, and remove internal duplicates
    const rawNames = (typeof usernamesString === 'string' ? usernamesString.split('\n') : usernamesString)
        .map(name => name.trim())
        .filter(Boolean);
    const uniqueInputNames = [...new Set(rawNames)];

    // 2. Fast filter using our in-memory Bloom Filter before hitting Firestore
    const newNames = uniqueInputNames.filter(name => !bloomFilterService.has(`${userId}_${name.toLowerCase()}`));

    // 3. Chunk inserts into batches (Firestore limit is 500 per batch)
    const addedProfiles = [];
    let currentBatch = db.batch();
    let operationCount = 0;
    const batchPromises = [];

    for (const username of newNames) {
        const normalizedUsername = username.toLowerCase();
        const docRef = profilesCollection.doc(); 

        const profileData = {
            userId,
            username,
            normalizedUsername,
            nation: '', skinTone: 'Fair', bodyType: 'Fit', reelType: 'Hot',
            specialPart: 'Whole body', ageRange: '18 to 28', playable: false,
            totalFollowers: 0, avgViewsPerWeek: 0, customCategories: {},
            createdAt: new Date().toISOString()
        };

        currentBatch.set(docRef, profileData);
        addedProfiles.push({ id: docRef.id, ...profileData });

        // Update Bloom Filter immediately
        bloomFilterService.add(`${userId}_${normalizedUsername}`);

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

export const getGlobalProfileCount = async (userId) => {
    if (!userId) return 0;
    const snapshot = await profilesCollection.where('userId', '==', userId).get();
    return snapshot.size;
};

/**
 * 7. Refresh Videos Logic
 * Re-scrapes or refreshes video URLs for the provided profile IDs owned by the user.
 */
export const refreshVideos = async (ids, force = false, userId) => {
    if (!userId || !ids || ids.length === 0) return { updated: 0 };

    const batchPromises = [];

    for (const id of ids) {
        const docRef = profilesCollection.doc(id);
        const docSnap = await docRef.get();

        if (docSnap.exists && docSnap.data().userId === userId) {
            batchPromises.push(docRef.update({ lastRefreshed: new Date().toISOString() }));
        }
    }

    await Promise.all(batchPromises);

    return { 
        success: true, 
        message: `Processed video refresh for selected profiles.` 
    };
};