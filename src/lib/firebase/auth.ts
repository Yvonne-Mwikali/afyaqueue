import AsyncStorage from "@react-native-async-storage/async-storage";
import { type Auth, getAuth, getReactNativePersistence, initializeAuth } from "firebase/auth";

import { firebaseApp } from "./config";

let instance: Auth | undefined;

/**
 * Firebase Auth with React Native persistence, so the signed-in user is
 * restored on the next app start. Firebase keeps its refresh token in
 * AsyncStorage (app-private storage).
 */
export function firebaseAuth(): Auth {
  if (instance) return instance;
  const app = firebaseApp();
  try {
    instance = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    // Already initialised for this app (e.g. after Fast Refresh).
    instance = getAuth(app);
  }
  return instance;
}
