import { useEffect, useSyncExternalStore } from "react";

import { useSession } from "@/features/auth/session";
import { useActiveHospitalId } from "@/features/hospitals/hospital-context";
import { queueSource } from "@/lib/backend";

import type { QueueEntry } from "./queue-entry";

type EntriesState = { patientId: string | null; entries: readonly QueueEntry[] };

const EMPTY: EntriesState = { patientId: null, entries: [] };

let state: EntriesState = EMPTY;
let unsubscribe: (() => void) | null = null;
const listeners = new Set<() => void>();

function setState(next: EntriesState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function watch(patientId: string): void {
  if (state.patientId === patientId && unsubscribe) return;
  unsubscribe?.();
  setState({ patientId, entries: [] });
  unsubscribe = queueSource.watchForPatient(
    patientId,
    (entries) => setState({ patientId, entries }),
    () => {
      // Keep the last known entries; the next mount re-subscribes.
      unsubscribe = null;
    }
  );
}

function stop(): void {
  unsubscribe?.();
  unsubscribe = null;
  setState(EMPTY);
}

/** The signed-in patient's queue entries, live (empty until check-in). */
export function useQueueEntries(
  /** "active": the current patient hospital only; "all": every hospital. */
  scope: "active" | "all" = "active"
): readonly QueueEntry[] {
  const { user } = useSession();
  const hospitalId = useActiveHospitalId();
  const patientId = user?.id ?? null;
  const current = useSyncExternalStore(subscribe, () => state);

  useEffect(() => {
    if (patientId) watch(patientId);
    else stop();
  }, [patientId]);

  if (current.patientId !== patientId) return EMPTY.entries;
  // Hospital-specific by default; never mix another hospital's queue in.
  return scope === "all"
    ? current.entries
    : current.entries.filter((entry) => entry.hospitalId === hospitalId);
}

/** Checks in to a booked appointment; throws AppError when it can't. */
export function checkIn(appointmentId: string, patientId: string | null): Promise<QueueEntry> {
  if (!patientId) return Promise.reject(new Error("Not signed in."));
  return queueSource.checkIn(appointmentId, patientId);
}
