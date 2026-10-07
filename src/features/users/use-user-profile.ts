import { useEffect, useSyncExternalStore } from "react";

import { useSession } from "@/features/auth/session";
import { userProfileRepository } from "@/lib/backend";

import { firstNameOf, initialsFrom, type UserProfile } from "./user-profile";

type ProfileState = {
  /** Whose profile this is; null before the first subscription. */
  uid: string | null;
  /** "missing" = signed in, but users/{uid} doesn't exist. */
  status: "loading" | "ready" | "missing" | "error";
  profile: UserProfile | null;
};

const LOADING: ProfileState = { uid: null, status: "loading", profile: null };

let state: ProfileState = LOADING;
let unsubscribe: (() => void) | null = null;
const listeners = new Set<() => void>();

function setState(next: ProfileState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function watch(uid: string): void {
  if (state.uid === uid && unsubscribe) return;
  unsubscribe?.();
  // Never carry one user's profile over to the next.
  setState({ uid, status: "loading", profile: null });
  unsubscribe = userProfileRepository.watch(
    uid,
    (profile) => setState({ uid, status: profile ? "ready" : "missing", profile }),
    () => {
      unsubscribe = null;
      setState({ uid, status: "error", profile: null });
    }
  );
}

function stop(): void {
  unsubscribe?.();
  unsubscribe = null;
  setState(LOADING);
}

/**
 * The signed-in user's live profile (users/{uid}). Only ever returns the
 * current user's data: switching accounts resets to "loading".
 */
export function useUserProfile(): ProfileState & { retry: () => void } {
  const { user } = useSession();
  const uid = user?.id ?? null;
  const current = useSyncExternalStore(subscribe, () => state);

  useEffect(() => {
    if (uid) watch(uid);
    else stop();
  }, [uid]);

  return {
    ...(current.uid === uid ? current : LOADING),
    retry: () => {
      if (!uid) return;
      unsubscribe = null;
      watch(uid);
    },
  };
}

/**
 * Name and initials for headers and greetings: from the profile, else the
 * signed-in account's own display name/email. "" when genuinely unknown.
 */
export function usePatientIdentity(): { firstName: string; initials: string } {
  const { user } = useSession();
  const { profile } = useUserProfile();
  const fullName = profile?.fullName || user?.displayName || "";
  const email = profile?.email || user?.email || "";
  return { firstName: firstNameOf(fullName), initials: initialsFrom(fullName, email) };
}
