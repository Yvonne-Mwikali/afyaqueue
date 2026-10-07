import { useEffect, useSyncExternalStore } from "react";

import { useActiveHospitalId } from "./hospital-context";

export type CachedList<T> = {
  status: "loading" | "ready" | "error";
  data: readonly T[];
  retry: () => void;
};

type Entry<T> = { status: "loading" | "ready" | "error"; data: readonly T[] };

/**
 * A list loaded once per hospital and shared by every screen (services,
 * doctors). Switching hospital shows that hospital's list, never another's.
 */
export function createHospitalCache<T>(load: (hospitalId: string) => Promise<T[]>) {
  const entries = new Map<string, Entry<T>>();
  const requests = new Map<string, Promise<void>>();
  const listeners = new Set<() => void>();
  const LOADING: Entry<T> = { status: "loading", data: [] };

  let version = 0;
  const set = (hospitalId: string, entry: Entry<T>): void => {
    entries.set(hospitalId, entry);
    version++;
    listeners.forEach((listener) => listener());
  };

  const fetch = (hospitalId: string): void => {
    if (requests.has(hospitalId)) return;
    requests.set(
      hospitalId,
      load(hospitalId).then(
        (data) => set(hospitalId, { status: "ready", data }),
        () => {
          requests.delete(hospitalId);
          set(hospitalId, { status: "error", data: entries.get(hospitalId)?.data ?? [] });
        }
      )
    );
  };

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  /** One hospital's list (null = nothing yet). */
  function useFor(hospitalId: string | null): CachedList<T> {
    const entry = useSyncExternalStore(subscribe, () =>
      hospitalId ? (entries.get(hospitalId) ?? LOADING) : LOADING
    );
    useEffect(() => {
      if (hospitalId) fetch(hospitalId);
    }, [hospitalId]);
    return {
      ...entry,
      retry: () => {
        if (!hospitalId) return;
        requests.delete(hospitalId);
        set(hospitalId, { status: "loading", data: entry.data });
        fetch(hospitalId);
      },
    };
  }

  return {
    useFor,
    /**
     * Several hospitals' lists at once (e.g. My Appointments across
     * hospitals); returns a lookup by hospital id.
     */
    useMany(hospitalIds: readonly string[]): (hospitalId: string) => readonly T[] {
      const key = [...new Set(hospitalIds)].sort().join(",");
      // Re-render when any entry changes; the snapshot is the cache version.
      useSyncExternalStore(subscribe, () => version);
      useEffect(() => {
        if (key) key.split(",").forEach(fetch);
      }, [key]);
      return (hospitalId) => entries.get(hospitalId)?.data ?? [];
    },
    /** The active hospital's list, loading it on first use. */
    use(): CachedList<T> {
      const hospitalId = useActiveHospitalId();
      const entry = useSyncExternalStore(subscribe, () =>
        hospitalId ? (entries.get(hospitalId) ?? LOADING) : LOADING
      );
      useEffect(() => {
        if (hospitalId) fetch(hospitalId);
      }, [hospitalId]);
      return {
        ...entry,
        retry: () => {
          if (!hospitalId) return;
          requests.delete(hospitalId);
          set(hospitalId, { status: "loading", data: entry.data });
          fetch(hospitalId);
        },
      };
    },
    /** Already-loaded list for a hospital, without subscribing. */
    peek(hospitalId: string | null): readonly T[] {
      return hospitalId ? (entries.get(hospitalId)?.data ?? []) : [];
    },
  };
}
