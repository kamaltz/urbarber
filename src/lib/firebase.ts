import { getApp, getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const requiredConfig = Object.entries(firebaseConfig).filter(
  ([, value]) => !value,
);

if (requiredConfig.length > 0) {
  throw new Error(
    `Firebase configuration is incomplete: ${requiredConfig
      .map(([key]) => key)
      .join(", ")}`,
  );
}

export const firebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

/**
 * Initialize Firebase Auth with web persistence fallbacks
 * Prevents "Database is closing/hidden" IndexedDB browser crashes
 */
export const firebaseAuth = (() => {
  if (Platform.OS === "web") {
    try {
      return initializeAuth(firebaseApp, {
        persistence: [
          indexedDBLocalPersistence,
          browserLocalPersistence,
          browserSessionPersistence,
        ],
      });
    } catch {
      return getAuth(firebaseApp);
    }
  }

  return getAuth(firebaseApp);
})();

export const firestore = getFirestore(firebaseApp);
export const firebaseFunctions = getFunctions(firebaseApp);