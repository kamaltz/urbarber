import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
} from "firebase/auth";
// getReactNativePersistence exists in the RN build at runtime (Metro resolves the
// package.json "react-native" field), but firebase's published types always resolve
// through the top-level "types" export condition, which points at the web-only public
// API surface and omits this RN-only helper -- a known firebase-js-sdk typing gap.
// @ts-expect-error -- getReactNativePersistence has no published type in this resolution
import { getReactNativePersistence } from "firebase/auth";
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
 * Initialize Firebase Auth with platform-appropriate persistence.
 * Web: IndexedDB with browser-storage fallbacks (prevents "Database is closing/hidden" crashes).
 * Native: AsyncStorage, so sessions survive app/Metro reloads instead of defaulting to memory-only.
 * Falls back to getAuth() if initializeAuth() was already called for this app instance
 * (e.g. Fast Refresh re-evaluating this module).
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

  try {
    return initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } catch {
    return getAuth(firebaseApp);
  }
})();

export const firestore = getFirestore(firebaseApp);
export const firebaseFunctions = getFunctions(firebaseApp);