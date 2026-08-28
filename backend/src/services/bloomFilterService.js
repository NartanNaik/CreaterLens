import { db } from "../config/firebase.js";

// We use an in-memory Set. It provides sub-millisecond O(1) lookups.
// For < 1,000,000 usernames, this uses negligible RAM (~10-20MB) 
// and completely avoids the false positives of a traditional Bloom Filter.
const memoryFilter = new Set();
let isInitialized = false;

/**
 * Normalizes a handle for consistent matching (lowercase, no @, trimmed)
 */
const normalize = (username) => {
  if (!username || typeof username !== "string") return "";
  return username.replace(/^@+/, "").trim().toLowerCase();
};

/**
 * Warms up the in-memory cache by fetching all existing usernames from Firestore.
 * Call this once in your main app.js or server startup file.
 */
export const initializeBloomFilter = async () => {
  if (isInitialized) return;

  try {
    console.log("🔄 [Bloom Filter] Warming up memory cache from Firestore...");
    
    // We only fetch the 'username' document IDs/fields to save bandwidth
    const profilesSnapshot = await db.collection("profiles").select().get();
    
    profilesSnapshot.forEach((doc) => {
      // Assuming the document ID is the username, or it's stored in the doc.
      // Adjust doc.id to doc.data().username if your IDs are auto-generated.
      memoryFilter.add(normalize(doc.id)); 
    });

    isInitialized = true;
    console.log(`✅ [Bloom Filter] Warmed up with ${memoryFilter.size} profiles. Ready for sub-millisecond deduplication.`);
  } catch (error) {
    console.error("❌ [Bloom Filter] Failed to initialize:", error.message);
  }
};

/**
 * Fast sub-millisecond check if a username might exist in the database.
 */
export const has = (username) => {
  return memoryFilter.has(normalize(username));
};

/**
 * Add a new username to the filter (call this when a profile is approved/saved)
 */
export const add = (username) => {
  const clean = normalize(username);
  if (clean) {
    memoryFilter.add(clean);
  }
};

/**
 * Remove a username from the filter (call this when a profile is deleted)
 */
export const remove = (username) => {
  const clean = normalize(username);
  if (clean) {
    memoryFilter.delete(clean);
  }
};

/**
 * Get current size of the filter
 */
export const size = () => {
  return memoryFilter.size;
};