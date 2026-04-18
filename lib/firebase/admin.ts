import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let adminApp: App | null = null;
let dbInstance: Firestore | null = null;

function initAdmin(): App {
  if (adminApp) return adminApp;
  const existing = getApps()[0];
  if (existing) {
    adminApp = existing;
    return existing;
  }

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!b64) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_B64 is not set. Provide a base64-encoded service account JSON."
    );
  }
  const json = Buffer.from(b64, "base64").toString("utf8");
  const credentials = JSON.parse(json);
  adminApp = initializeApp({ credential: cert(credentials) });
  return adminApp;
}

export function adminAuth(): Auth {
  return getAuth(initAdmin());
}

export function adminDb(): Firestore {
  if (dbInstance) return dbInstance;
  const db = getFirestore(initAdmin());
  // Drop `undefined` fields silently rather than throwing. Our resolver
  // output contains optional fields (e.g. `sentence` on math problems)
  // that shouldn't land in Firestore at all.
  db.settings({ ignoreUndefinedProperties: true });
  dbInstance = db;
  return db;
}

/**
 * Verify a Firebase ID token from an incoming request's Authorization header.
 * Returns the decoded token (including uid) or throws.
 */
export async function verifyBearerToken(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing bearer token");
  }
  const token = authHeader.slice("Bearer ".length);
  return adminAuth().verifyIdToken(token);
}
