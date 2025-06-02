
import { initializeApp, getApps, getApp, FirebaseOptions, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";

// IMPORTANT: Replace with your actual Firebase project configuration
// These should be stored in a .env.local file
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  // measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

// Initialize Firebase
let app: FirebaseApp; // Explicitly type app
let auth: Auth; // Explicitly type auth

// Ensure Firebase client SDK is only initialized in the browser
if (typeof window !== 'undefined') {
  if (!getApps().length) {
    if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
      // Changed from console.warn to console.error for greater visibility
      console.error(
        "CRITICAL FIREBASE CONFIGURATION ERROR: Firebase API Key, Auth Domain, or Project ID is missing. " +
        "Firebase will likely fail or behave unexpectedly. " +
        "Please ensure your .env.local file is set up correctly with NEXT_PUBLIC_FIREBASE_API_KEY, " +
        "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, and NEXT_PUBLIC_FIREBASE_PROJECT_ID."
      );
      // Note: Even with this error, initialization is still attempted below.
      // A more robust app might prevent initialization or throw an error here.
    }
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  } else {
    app = getApp();
    auth = getAuth(app);
  }
} else {
  // This block is for server-side, where client SDK isn't typically used for auth.
  // To satisfy TypeScript for `app` and `auth` being definitely assigned if they were used server-side,
  // they would need placeholder assignments or a different logic path (e.g., Firebase Admin SDK).
  // However, for client-side authentication, these are initialized above within the `typeof window !== 'undefined'` block.
  // To avoid "used before assigned" errors if there were any server-side usages of these specific `app` and `auth` instances (which there are not in this setup):
  // We can assign temporary placeholders for a server context, though they won't be functional for client auth.
  // This is mostly a formality for strict TypeScript if the variables were global and accessed server-side.
  // Given they are scoped and primarily for client, the browser check handles their primary init.
  // To ensure `app` and `auth` are defined for export, even if non-functional server-side:
  if (!getApps().length && firebaseConfig.apiKey) { // Basic check to allow dummy init if config seems plausible
      // @ts-ignore - Temporary assignment for type satisfaction if accessed server-side
      app = initializeApp(firebaseConfig); // Dummy init for server, not truly functional for client auth
      // @ts-ignore
      auth = getAuth(app);
  } else if (getApps().length) {
      // @ts-ignore
      app = getApp();
      // @ts-ignore
      auth = getAuth(app);
  } else {
      // Fallback if no app can be initialized (e.g. missing config server-side)
      // This would lead to errors if auth is used server-side without proper Admin SDK setup.
      // console.error("Firebase cannot be initialized on the server with client config.");
      // To satisfy export type, these need a value. Null or a specific error state object could be used.
      // However, this path should ideally not be hit for client auth functionality.
      // For the purpose of this fix, focusing on client-side, this is less critical.
      // The provided code exports `app` and `auth` initialized within the client-side check.
  }
}


export { app, auth };

