import type { Persistence, ReactNativeAsyncStorage } from "firebase/auth";

/**
 * `firebase/auth` re-exports `@firebase/auth`, which Metro resolves to its
 * React Native build (the "react-native" export condition). That build
 * exports getReactNativePersistence, but `firebase/auth`'s own typings only
 * describe the web build, so declare it here.
 */
declare module "firebase/auth" {
  export function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence;
}
