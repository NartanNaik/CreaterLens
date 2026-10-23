// In-memory, per-instance set of "userId_username" keys that THIS server instance has seen.
//
// It is deliberately NOT pre-loaded from Firestore. The old warm-up ran
// db.collection("profiles").select().get() on every serverless cold start, which bills
// one read per document across ALL users and exhausted the daily Firestore quota
// (RESOURCE_EXHAUSTED). It also stored document IDs while lookups use
// `${userId}_${normalizedUsername}` keys, so it never matched anything anyway.
//
// Firestore is the source of truth. Treat a `false` from has() as "unknown", never as
// "definitely absent", and verify with a query when correctness matters.

const memoryFilter = new Set();

/**
 * Normalizes a key for consistent matching (lowercase, no leading @, trimmed)
 */
const normalize = (username) => {
  if (!username || typeof username !== "string") return "";
  return username.replace(/^@+/, "").trim().toLowerCase();
};

/**
 * Kept so existing imports keep working. It no longer reads from Firestore.
 */
export const initializeBloomFilter = async () => {
  // Intentionally a no-op: see the note at the top of this file.
};

/**
 * True only if this instance has already seen the key (added/approved during its lifetime).
 */
export const has = (username) => {
  return memoryFilter.has(normalize(username));
};

/**
 * Remember a key (call when a profile is approved/saved)
 */
export const add = (username) => {
  const clean = normalize(username);
  if (clean) {
    memoryFilter.add(clean);
  }
};

/**
 * Forget a key (call when a profile is deleted)
 */
export const remove = (username) => {
  const clean = normalize(username);
  if (clean) {
    memoryFilter.delete(clean);
  }
};

/**
 * Number of keys currently remembered by this instance
 */
export const size = () => {
  return memoryFilter.size;
};