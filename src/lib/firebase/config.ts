import {
  type FirebaseApp,
  type FirebaseOptions,
  getApp,
  getApps,
  initializeApp,
} from "firebase/app";

/**
 * Firebase web-app configuration from Expo public env vars (see .env.example
 * and docs/firebase-setup.md). These values identify the project; they are
 * not secrets. Access is enforced by Firestore security rules.
 *
 * Each variable is read with direct `process.env.EXPO_PUBLIC_…` access so
 * Expo can inline it at bundle time.
 */
const options: FirebaseOptions = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

/** True once every value is set to something other than the .env.example placeholder. */
export const isFirebaseConfigured = Object.values(options).every(
  (value) => typeof value === "string" && value.length > 0 && !value.startsWith("your-")
);

/** The single Firebase app instance (survives Fast Refresh). */
export function firebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured. See docs/firebase-setup.md.");
  }
  return getApps().length > 0 ? getApp() : initializeApp(options);
}
