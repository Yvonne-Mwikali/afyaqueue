import { doc, type DocumentData, onSnapshot, Timestamp } from "firebase/firestore";

import { COLLECTIONS, firestore } from "@/lib/firebase/firestore";

import type { UserProfile, UserRole } from "./user-profile";
import type { UserProfileRepository } from "./user-profile-repository";

const ROLES: readonly UserRole[] = ["patient", "staff", "admin"];

const dateOf = (value: unknown): Date | undefined =>
  value instanceof Timestamp ? value.toDate() : undefined;
const textOf = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;

/** Maps users/{uid} to the domain type. Unknown or empty fields are omitted. */
export function parseUserProfile(uid: string, data: DocumentData): UserProfile {
  const phone = textOf(data.phone);
  const language = textOf(data.language);
  const dateOfBirth = dateOf(data.dateOfBirth);
  const createdAt = dateOf(data.createdAt);
  const updatedAt = dateOf(data.updatedAt);
  return {
    uid,
    fullName: textOf(data.fullName) ?? "",
    email: textOf(data.email) ?? "",
    // An unknown role is kept as is so routing can refuse it, never upgraded or guessed.
    role: ROLES.includes(data.role) ? data.role : "unknown",
    ...(phone ? { phone } : {}),
    ...(dateOfBirth ? { dateOfBirth } : {}),
    ...(language ? { language } : {}),
    ...(typeof data.notificationsEnabled === "boolean"
      ? { notificationsEnabled: data.notificationsEnabled }
      : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(updatedAt ? { updatedAt } : {}),
  };
}

export const firestoreUserProfileRepository: UserProfileRepository = {
  watch: (uid, onChange, onError) =>
    onSnapshot(
      doc(firestore(), COLLECTIONS.users, uid),
      (snapshot) => onChange(snapshot.exists() ? parseUserProfile(uid, snapshot.data()) : null),
      onError
    ),
};
