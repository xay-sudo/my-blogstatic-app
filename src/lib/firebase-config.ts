
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

    if (configError) {
      console.error(
        "Firebase will likely fail or behave unexpectedly. " +
        "Please ensure your .env.local file is set up correctly with all required NEXT_PUBLIC_FIREBASE_... variables, " +
        "and restart your development server."
      );
    }
    
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  } else {
    app = getApp();
    auth = getAuth(app);
  }
} else {
  // This block is for server-side.
  // For client-side authentication, initialization happens in the `if (typeof window !== 'undefined')` block.
  // To satisfy TypeScript for `app` and `auth` being definitely assigned if they were used server-side,
  // we provide a fallback initialization, though it's not ideal for client auth features on server.
  if (!getApps().length && firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId) {
      // @ts-ignore - Assigning for type satisfaction in server context if needed elsewhere.
      app = initializeApp(firebaseConfig);
      // @ts-ignore
      auth = getAuth(app);
  } else if (getApps().length) {
      // @ts-ignore
      app = getApp();
      // @ts-ignore
      auth = getAuth(app);
  } else {
      // console.error("Firebase cannot be initialized on the server with client config without all required keys.");
      // To ensure 'app' and 'auth' have some value for export even in this unlikely server path without full config:
      // @ts-ignore
      app = undefined; 
      // @ts-ignore
      auth = undefined;
  }
}

export { app, auth };
