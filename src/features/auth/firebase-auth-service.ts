import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { firebaseAuth } from "@/lib/firebase/auth";
import { COLLECTIONS, firestore } from "@/lib/firebase/firestore";

import { AuthError, type AuthService, type AuthUser } from "./auth-service";

function toAuthUser(user: User): AuthUser {
  return {
    id: user.uid,
    displayName: user.displayName ?? "",
    email: user.email ?? "",
    emailVerified: user.emailVerified,
  };
}

const MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Email or password is incorrect.",
  "auth/wrong-password": "Email or password is incorrect.",
  "auth/user-not-found": "Email or password is incorrect.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/missing-email": "Enter your email address.",
  "auth/user-disabled": "This account has been disabled. Please contact the hospital.",
  "auth/email-already-in-use": "An account with this email already exists. Sign in instead.",
  "auth/weak-password": "Choose a stronger password.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/network-request-failed": "No connection. Check your internet and try again.",
  // Firestore (profile write during registration).
  "permission-denied":
    "Your account was created, but your profile couldn't be saved. Sign in again later to finish.",
  unavailable: "No connection. Check your internet and try again.",
};

/** Rethrows Firebase errors as AuthErrors with patient-facing wording. */
function rethrow(error: unknown): never {
  const code = error instanceof FirebaseError ? error.code : "";
  throw new AuthError(MESSAGES[code] ?? "Something went wrong. Please try again.");
}

type NewProfile = { fullName: string; phone: string; email: string };

/** Creates users/{uid}; rules only allow creating your own, as a patient. */
function createProfile(uid: string, { fullName, phone, email }: NewProfile): Promise<void> {
  return setDoc(doc(firestore(), COLLECTIONS.users, uid), {
    fullName,
    phone,
    email,
    role: "patient",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Repairs an account whose profile write failed at registration (e.g. a
 * dropped connection): signing in creates the missing profile. Never
 * overwrites an existing one. Best effort: sign-in still succeeds if this
 * fails, and it is retried on the next sign-in.
 */
async function ensureProfile(user: User): Promise<void> {
  try {
    const ref = doc(firestore(), COLLECTIONS.users, user.uid);
    if ((await getDoc(ref)).exists()) return;
    await createProfile(user.uid, {
      fullName: user.displayName ?? "",
      phone: user.phoneNumber ?? "",
      email: user.email ?? "",
    });
  } catch {
    // Retried on the next sign-in.
  }
}

/** Firebase Authentication (email/password) plus the patient's users/{uid} profile. */
export const firebaseAuthService: AuthService = {
  onUserChanged: (listener) =>
    onAuthStateChanged(firebaseAuth(), (user) => listener(user ? toAuthUser(user) : null)),

  signIn: async ({ email, password }) => {
    try {
      const { user } = await signInWithEmailAndPassword(firebaseAuth(), email, password);
      await ensureProfile(user);
    } catch (error) {
      rethrow(error);
    }
  },

  register: async ({ fullName, phone, email, password }) => {
    try {
      const { user } = await createUserWithEmailAndPassword(firebaseAuth(), email, password);
      await updateProfile(user, { displayName: fullName });
      await createProfile(user.uid, { fullName, phone, email });
    } catch (error) {
      rethrow(error);
    }
  },

  signOut: async () => {
    try {
      await signOut(firebaseAuth());
    } catch (error) {
      rethrow(error);
    }
  },

  sendEmailVerification: async () => {
    const user = firebaseAuth().currentUser;
    if (!user) throw new AuthError("Please sign in again.");
    try {
      await sendEmailVerification(user);
    } catch (error) {
      rethrow(error);
    }
  },

  refreshUser: async () => {
    const user = firebaseAuth().currentUser;
    if (!user) return null;
    try {
      await user.reload();
      // New token so rules see email_verified.
      await user.getIdToken(true);
      return toAuthUser(user);
    } catch (error) {
      rethrow(error);
    }
  },

  sendPasswordReset: async (email) => {
    try {
      await sendPasswordResetEmail(firebaseAuth(), email);
    } catch (error) {
      // Never reveal whether an account exists for this email.
      if (error instanceof FirebaseError && error.code === "auth/user-not-found") return;
      rethrow(error);
    }
  },
};
