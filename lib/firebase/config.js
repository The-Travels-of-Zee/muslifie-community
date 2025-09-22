import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, GoogleAuthProvider, OAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig, "client");

// Initialize Firebase services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider("apple.com");

// scopes to request email and name
appleProvider.addScope("email");
appleProvider.addScope("name");

// Optional: Add custom parameters
appleProvider.setCustomParameters({
  // Request user's email and name on first sign-in
  locale: "en",
});

// Additional helper function for better Apple user data extraction
export function extractAppleUserData(firebaseUser) {
  const providerData = firebaseUser.providerData?.find((provider) => provider.providerId === "apple.com");

  return {
    email: firebaseUser.email || providerData?.email,
    displayName:
      firebaseUser.displayName || providerData?.displayName || firebaseUser.email?.split("@")[0] || "Apple User",
    uid: firebaseUser.uid,
    providerId: "apple.com",
  };
}

export default app;
