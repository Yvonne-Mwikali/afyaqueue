/**
 * The signed-in user's profile: users/{uid} (docs/firebase-data-model.md).
 * Optional fields are omitted when unknown; never fill them with guesses.
 */
/** "unknown" = the profile has a role this app version doesn't support. */
export type UserRole = "patient" | "staff" | "admin" | "unknown";

export type UserProfile = {
  uid: string;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  dateOfBirth?: Date;
  language?: string;
  notificationsEnabled?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

/** First word of a full name, or "" when there is no name. */
export function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

/** Up to two initials from a full name, falling back to the email's first letter. */
export function initialsFrom(fullName: string, email = ""): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
  return (first + last || email[0] || "").toUpperCase();
}

/** Which part of the app a signed-in user may use, from their profile role. */
export type AppArea = "patient" | "staff";

/**
 * Patients use the patient app; staff (and admins, who can also operate
 * queues) use the staff app. Anything else gets no area: never guess.
 */
export function areaForRole(role: string | undefined): AppArea | null {
  if (role === "patient") return "patient";
  if (role === "staff" || role === "admin") return "staff";
  return null;
}
