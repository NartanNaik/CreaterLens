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