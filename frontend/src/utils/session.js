// Session helpers: everything that belongs to ONE signed-in account lives behind these functions,
// so switching accounts can never show the previous account's data.
const resetters = new Set();
let epoch = 0;

// Components with module-level caches register a function that empties them.
export const registerSessionReset = (fn) => {
  resetters.add(fn);
  return () => resetters.delete(fn);
};

// Changes every time the session is cleared/started. Async fetches capture it before the request
// and drop their result if it changed meanwhile (a late response from the old account).
export const getSessionEpoch = () => epoch;

const PER_USER_KEYS = ['hiddenCols', 'renamedCols'];

const wipe = () => {
  epoch += 1;
  resetters.forEach((fn) => {
    try { fn(); } catch (e) { console.error('Session reset failed:', e); }
  });
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    PER_USER_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
};

export const clearSession = wipe;

// Called right after a successful sign-in: start from a clean slate, then store the new account.
export const startSession = (token, user) => {
  wipe();
  try {
    localStorage.setItem('token', token);
    if (user) localStorage.setItem('user', JSON.stringify(user));
  } catch (e) {
    console.error('Could not store session:', e);
  }
};

// ---- Signed-in user (stored by startSession) ----
export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

// Merge a few fields into the stored user (for example { tourDone: true }).
export const patchStoredUser = (patch) => {
  try {
    const next = { ...(getStoredUser() || {}), ...patch };
    localStorage.setItem('user', JSON.stringify(next));
  } catch { /* ignore */ }
};

// "Nartan Maruti Naik" -> "Nartan"; falls back to the part of the email before "@".
export const getFirstName = (user) => {
  const fromName = String(user?.name || '').trim().split(/\s+/)[0];
  if (fromName) return fromName;
  return String(user?.email || '').split('@')[0] || '';
};