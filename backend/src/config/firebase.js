import dotenv from "dotenv";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

dotenv.config();

/*
  Private keys pasted into env dashboards (Vercel etc.) usually arrive in one of these shapes:
    - literal "\n" sequences instead of real newlines
    - wrapped in extra quotes
    - already containing real newlines
  Normalise all three so cert() always gets a valid PEM.
*/
const normalizePrivateKey = (raw) => {
  if (!raw) return undefined;

  let key = raw.trim();

  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  return key.replace(/\\n/g, "\n");
};

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

// cert() only needs these three. The other FIREBASE_* variables were never required.
// Failing here with the exact variable names beats a vague 500 later.
const missing = [
  !projectId && "FIREBASE_PROJECT_ID",
  !clientEmail && "FIREBASE_CLIENT_EMAIL",
  !privateKey && "FIREBASE_PRIVATE_KEY",
].filter(Boolean);

if (missing.length > 0) {
  throw new Error(`Firebase is not configured. Missing environment variable(s): ${missing.join(", ")}`);
}

if (!privateKey.includes("BEGIN PRIVATE KEY")) {
  throw new Error("FIREBASE_PRIVATE_KEY does not look like a valid PEM private key.");
}

// Reuse the app across warm serverless invocations / hot reloads
if (!getApps().length) {
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

const db = getFirestore();

// Must run before the first read/write, and may only run once per Firestore instance.
// ignoreUndefinedProperties stops "Cannot use undefined as a Firestore value" errors
// (a common hidden source of 500s when an optional field comes through as undefined).
try {
  db.settings({ ignoreUndefinedProperties: true });
} catch {
  // Already configured on a warm instance. Safe to ignore.
}

export { db, FieldValue };