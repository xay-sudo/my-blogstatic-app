
import { initializeApp, getApps, getApp, FirebaseOptions, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getStorage, FirebaseStorage } from "firebase/storage"; // Import Firebase Storage

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
let app: FirebaseApp;
let auth: Auth;
let storage: FirebaseStorage; // Declare storage

// Ensure Firebase client SDK is only initialized in the browser
if (typeof window !== 'undefined') {
  if (!getApps().length) {
    let configError = false;
    if (!firebaseConfig.apiKey) {
      console.error("CRITICAL FIREBASE CONFIG ERROR: NEXT_PUBLIC_FIREBASE_API_KEY is missing or empty. Please check your .env.local file.");
      configError = true;
    }
    if (!firebaseConfig.authDomain) {
      console.error("CRITICAL FIREBASE CONFIG ERROR: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is missing or empty. Please check your .env.local file.");
      configError = true;
    }
    if (!firebaseConfig.projectId) {
      console.error("CRITICAL FIREBASE CONFIG ERROR: NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing or empty. Please check your .env.local file.");
      configError = true;
    }
     if (!firebaseConfig.storageBucket) {
      console.error("CRITICAL FIREBASE CONFIG ERROR: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is missing or empty. Please check your .env.local file for Firebase Storage.");
      configError = true;
    }

    if (configError) {
      console.error(
        "Firebase will likely fail or behave unexpectedly. " +
        "Please ensure your .env.local file is set up correctly with all required NEXT_PUBLIC_FIREBASE_... variables, " +
        "and restart your development server."
      );
      // @ts-ignore
      app = undefined;
      // @ts-ignore
      auth = undefined;
      // @ts-ignore
      storage = undefined;
    } else {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      storage = getStorage(app); // Initialize storage
    }
  } else {
    app = getApp();
    auth = getAuth(app);
    storage = getStorage(app); // Initialize storage
  }
} else {
  // This block is for server-side.
  // Initialize if critical configs are present and no apps initialized yet.
  if (!getApps().length && firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.storageBucket) {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      storage = getStorage(app);
  } else if (getApps().length) { // If apps are initialized, get the default one
      app = getApp();
      auth = getAuth(app);
      storage = getStorage(app);
  } else {
      // Fallback if no apps and critical config missing server-side (less ideal, but prevents crashes)
      console.warn("Firebase server-side initialization skipped due to missing critical configuration or no existing app.");
      // @ts-ignore
      app = undefined; 
      // @ts-ignore
      auth = undefined;
      // @ts-ignore
      storage = undefined;
  }
}

export { app, auth, storage }; // Export storage
