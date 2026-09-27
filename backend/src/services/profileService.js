import { db } from '../config/firebase.js';
import * as bloomFilterService from './bloomFilterService.js';

// We are targeting the active 'profiles' collection
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
 * Creates a new profile with strict numeric validation and syncs it to the Bloom Filter.
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
        // Edge Case Protection: Force non-negative integers. No NaNs.
        totalFollowers: Math.max(0, parseInt(profileData.totalFollowers, 10) || 0),
        avgViewsPerWeek: Math.max(0, parseInt(profileData.avgViewsPerWeek, 10) || 0),
        customCategories: profileData.customCategories || {},
        createdAt: new Date().toISOString()
    };

    const docRef = await profilesCollection.add(newProfile);
    
    // Sync with memory cache
    bloomFilterService.add(normalizedUsername);

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
 * Updates specific fields of an existing profile with numeric safety nets.
 */
export const updateProfile = async (profileId, updateData) => {
    const docRef = profilesCollection.doc(profileId);
    
    const doc = await docRef.get();
    if (!doc.exists) {
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
 * Removes a profile and clears its handle from the Bloom Filter memory cache.
 */
export const deleteProfile = async (profileId) => {
    const docRef = profilesCollection.doc(profileId);
    const doc = await docRef.get();
    
    if (doc.exists) {
        const data = doc.data();
        // Remove from memory cache so it can be staged again if needed
        bloomFilterService.remove(data.normalizedUsername);
        await docRef.delete();
    }
    
    return true;
};

/**
 * 6. Mass Upload Logic
 * Efficiently processes bulk uploads, sanitizes data, and syncs the cache.
 */
export const massUploadProfiles = async (usernamesString) => {
    // 1. Split string by newlines, trim, and remove internal duplicates
    const rawNames = usernamesString.split('\n').map(name => name.trim()).filter(Boolean);
    const uniqueInputNames = [...new Set(rawNames)];

    // 2. Fast filter using our in-memory Bloom Filter before hitting Firestore
    const newNames = uniqueInputNames.filter(name => !bloomFilterService.has(name));

    // 3. Chunk inserts into batches (Firestore limit is 500 per batch)
    const addedProfiles = [];
    let currentBatch = db.batch();
    let operationCount = 0;
    const batchPromises = [];

    for (const username of newNames) {
        const normalizedUsername = username.toLowerCase();
        const docRef = profilesCollection.doc(); 
        
        const profileData = {
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
        bloomFilterService.add(normalizedUsername);
        
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

export const getGlobalProfileCount = async () => {
    const snapshot = await profilesCollection.get();
    return snapshot.size;
};
