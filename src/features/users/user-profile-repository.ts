import type { UserProfile } from "./user-profile";

export interface UserProfileRepository {
  /**
   * Streams users/{uid}: the profile, or null when the document doesn't
   * exist. Returns an unsubscribe function.
   */
  watch(
    uid: string,
    onChange: (profile: UserProfile | null) => void,
    onError: (error: unknown) => void
  ): () => void;
}
