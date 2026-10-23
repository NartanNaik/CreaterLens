import { db } from '../config/firebase.js';
import * as bloomFilterService from './bloomFilterService.js';

// We are targeting the active 'profiles' collection
const profilesCollection = db.collection('profiles');

// Firestore allows up to 30 values in an `in` filter.
const IN_QUERY_LIMIT = 30;
// How many `in` queries to run at once during mass upload.
const IN_QUERY_PARALLELISM = 10;

/**
 * Returns a safe http(s) URL string, or '' if the input is empty/invalid.
 * Blocks javascript:, data: etc., because this value is rendered as a link in the dashboard.
 */
export const cleanSourceUrl = (value) => {
    if (typeof value !== 'string') return '';
    const trimmed = value.trim().slice(0, 2048);
    if (!trimmed) return '';

    try {
        const parsed = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
        return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : '';
    } catch {
        return '';
    }
};

/**
 * 1. The Uniqueness Checker
 * Checks if a profile already exists in the user's database.
 */
export const checkProfileExists = async (username, userId) => {
    const normalized = username.toLowerCase().trim();
    const snapshot = await profilesCollection
        .where('userId', '==', userId)
        .where('normalizedUsername', '==', normalized)
        .limit(1)
        .get();
    return !snapshot.empty;
};

/**
 * 2. The Insertion Logic
 * Creates a new profile with strict numeric validation and ownership.
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
        // Pasted Instagram link (was silently dropped before, so manual adds showed "-" in the Link column)
        sourceUrl: cleanSourceUrl(profileData.sourceUrl),
        // Edge Case Protection: Force non-negative integers. No NaNs.
        totalFollowers: Math.max(0, parseInt(profileData.totalFollowers, 10) || 0),
        avgViewsPerWeek: Math.max(0, parseInt(profileData.avgViewsPerWeek, 10) || 0),
        customCategories: profileData.customCategories || {},
        createdAt: new Date().toISOString()
    };

    const docRef = await profilesCollection.add(newProfile);

    // Remember it for this instance's lifetime (scoped by user)
    bloomFilterService.add(`${userId}_${normalizedUsername}`);

    return { id: docRef.id, ...newProfile };
};

/**
 * 3. The Fetch Logic
 * Retrieves all profiles for the logged-in user to populate the frontend table.
 * Sorted in memory: userId + orderBy("createdAt") would need a composite index.
 */
export const getProfiles = async (userId, category = '') => {
    if (!userId) throw new Error('Unauthorized: userId is required.');

    let query = profilesCollection.where('userId', '==', userId);

    if (category) {
        query = query.where('category', '==', category);
    }

    const snapshot = await query.get();
    const profiles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    profiles.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return profiles;
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
 * Removes a profile and forgets its handle in this instance's memory.
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
 * Finds which of the given normalized usernames this user already has.
 * Uses `in` queries on a single field (no composite index needed) and filters by
 * userId in memory, so reads scale with the matches found, not with collection size.
 */
const findExistingNormalizedNames = async (normalizedNames, userId) => {
    const existing = new Set();

    const chunks = [];
    for (let i = 0; i < normalizedNames.length; i += IN_QUERY_LIMIT) {
        chunks.push(normalizedNames.slice(i, i + IN_QUERY_LIMIT));
    }

    for (let i = 0; i < chunks.length; i += IN_QUERY_PARALLELISM) {
        const group = chunks.slice(i, i + IN_QUERY_PARALLELISM);
        const snapshots = await Promise.all(
            group.map(chunk => profilesCollection.where('normalizedUsername', 'in', chunk).get())
        );

        snapshots.forEach(snapshot => {
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.userId === userId) existing.add(data.normalizedUsername);
            });
        });
    }

    return existing;
};

/**
 * 6. Mass Upload Logic
 * Sanitizes bulk input, skips usernames the user already has, and inserts the rest in batches.
 */
export const massUploadProfiles = async (usernamesString, userId) => {
    if (!userId) throw new Error('Unauthorized: userId is required.');

    // 1. Split string by newlines, trim, and remove internal duplicates (case-insensitive)
    const rawNames = (typeof usernamesString === 'string' ? usernamesString.split('\n') : usernamesString)
        .map(name => name.trim())
        .filter(Boolean);

    const uniqueByNormalized = new Map();
    for (const name of rawNames) {
        const key = name.toLowerCase();
        if (!uniqueByNormalized.has(key)) uniqueByNormalized.set(key, name);
    }

    // 2. Ask Firestore which of these this user already has (cheap `in` queries)
    const existing = await findExistingNormalizedNames([...uniqueByNormalized.keys()], userId);
    const newNames = [...uniqueByNormalized.entries()].filter(([key]) => !existing.has(key));

    // 3. Chunk inserts into batches (Firestore limit is 500 per batch)
    const addedProfiles = [];
    let currentBatch = db.batch();
    let operationCount = 0;
    const batchPromises = [];

    for (const [normalizedUsername, username] of newNames) {
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

// Uses an aggregation query: billed roughly 1 read per 1,000 matching docs instead of 1 per doc.
export const getGlobalProfileCount = async (userId) => {
    if (!userId) return 0;
    const snapshot = await profilesCollection.where('userId', '==', userId).count().get();
    return snapshot.data().count;
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