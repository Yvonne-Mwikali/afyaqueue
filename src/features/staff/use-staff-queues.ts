import { useCallback, useEffect, useState } from "react";

import { localDateKey } from "@/features/appointments/appointment";
import { useActiveHospitalId, useHospitalContext } from "@/features/hospitals/hospital-context";
import type { QueueNoticeContext } from "@/features/notifications/notification";
import type { HoldReason, QueueAction } from "@/features/queues/queue-actions";
import { useServiceCatalog } from "@/features/services/use-service-catalog";
import { staffQueueRepository } from "@/lib/backend";

import type { StaffQueue, StaffQueueEntry, StaffVisit } from "./staff-queue";

type Live<T> = { status: "loading" | "ready" | "error"; data: T; retry: () => void };

type Watch<T> = (onChange: (data: T) => void, onError: () => void) => () => void;

/** Shared live-subscription state with a retry that resubscribes. */
function useLive<T>(watch: Watch<T>, initial: T): Live<T> {
  const [state, setState] = useState<Omit<Live<T>, "retry">>({ status: "loading", data: initial });
  const [attempt, setAttempt] = useState(0);
  useEffect(
    () =>
      watch(
        (data) => setState({ status: "ready", data }),
        () => setState((current) => ({ ...current, status: "error" }))
      ),
    [watch, attempt]
  );
  return {
    ...state,
    retry: () => {
      setState({ status: "loading", data: initial });
      setAttempt((count) => count + 1);
    },
  };
}

/** No hospital chosen yet: stay "loading" without subscribing. */
const noop = (): void => undefined;

const EMPTY_QUEUES: StaffQueue[] = [];
const EMPTY_VISITS: StaffVisit[] = [];
const EMPTY_ENTRIES: StaffQueueEntry[] = [];

/** Today's queues, live. */
export function useTodayQueues(): Live<StaffQueue[]> {
  const date = localDateKey(new Date());
  const hospitalId = useActiveHospitalId();
  const watch = useCallback<Watch<StaffQueue[]>>(
    (onChange, onError) =>
      hospitalId ? staffQueueRepository.watchQueues(hospitalId, date, onChange, onError) : noop,
    [hospitalId, date]
  );
  return useLive(watch, EMPTY_QUEUES);
}

/** Today's appointments (all services, cancelled excluded), live. */
export function useTodayVisits(): Live<StaffVisit[]> {
  const date = localDateKey(new Date());
  const hospitalId = useActiveHospitalId();
  const watch = useCallback<Watch<StaffVisit[]>>(
    (onChange, onError) =>
      hospitalId ? staffQueueRepository.watchVisits(hospitalId, date, onChange, onError) : noop,
    [hospitalId, date]
  );
  return useLive(watch, EMPTY_VISITS);
}

/** Live entries of the given queues (with patient display name and appointment context). */
export function useQueueEntriesFor(queueIds: readonly string[]): Live<StaffQueueEntry[]> {
  const key = [...queueIds].sort().join(",");
  const hospitalId = useActiveHospitalId();
  const watch = useCallback<Watch<StaffQueueEntry[]>>(
    (onChange, onError) =>
      hospitalId
        ? staffQueueRepository.watchEntries(
            hospitalId,
            key ? key.split(",") : [],
            onChange,
            onError
          )
        : noop,
    [hospitalId, key]
  );
  return useLive(watch, EMPTY_ENTRIES);
}

/** The signed-in doctor's appointments today (their workspace's doctorId only). */
export function useDoctorVisits(doctorId: string | null): Live<StaffVisit[]> {
  const date = localDateKey(new Date());
  const hospitalId = useActiveHospitalId();
  const watch = useCallback<Watch<StaffVisit[]>>(
    (onChange, onError) =>
      hospitalId && doctorId
        ? staffQueueRepository.watchVisits(hospitalId, date, onChange, onError, doctorId)
        : noop,
    [hospitalId, date, doctorId]
  );
  return useLive(watch, EMPTY_VISITS);
}

/** The signed-in doctor's queue entries since the start of today. */
export function useDoctorEntries(doctorId: string | null): Live<StaffQueueEntry[]> {
  const date = localDateKey(new Date());
  const hospitalId = useActiveHospitalId();
  const watch = useCallback<Watch<StaffQueueEntry[]>>(
    (onChange, onError) => {
      if (!hospitalId || !doctorId) return noop;
      // Local midnight of `date` ("YYYY-MM-DD" parses as local time with a time part).
      const startOfDay = new Date(`${date}T00:00:00`);
      return staffQueueRepository.watchDoctorEntries(
        hospitalId,
        doctorId,
        startOfDay,
        onChange,
        onError
      );
    },
    [hospitalId, doctorId, date]
  );
  return useLive(watch, EMPTY_ENTRIES);
}

/** "{serviceId}_{YYYY-MM-DD}" → serviceId. */
function serviceIdOf(queueId: string): string {
  const cut = queueId.lastIndexOf("_");
  return cut > 0 ? queueId.slice(0, cut) : queueId;
}

/**
 * Queue actions as the signed-in member (staff, admin or doctor); the role
 * is recorded on each audit event. Rules decide what this member may touch.
 * Service and hospital names go into the patient's notification wording.
 */
export function useQueueActions(): {
  callNext: (queueId: string, candidates: readonly string[]) => Promise<string | null>;
  perform: (
    entry: Pick<StaffQueueEntry, "id" | "queueId">,
    action: Exclude<QueueAction, "call">,
    holdReason?: HoldReason
  ) => Promise<void>;
} {
  const { workspace, hospitals } = useHospitalContext();
  const { services } = useServiceCatalog();
  const role = workspace?.role ?? "staff";
  const hospitalName = hospitals.find((hospital) => hospital.id === workspace?.hospitalId)?.name;
  const contextFor = (queueId: string): QueueNoticeContext => {
    const serviceName = services.find((service) => service.id === serviceIdOf(queueId))?.name;
    return {
      ...(serviceName ? { serviceName } : {}),
      ...(hospitalName ? { hospitalName } : {}),
    };
  };
  return {
    callNext: (queueId, candidates) =>
      staffQueueRepository.callNext(queueId, candidates, role, contextFor(queueId)),
    perform: (entry, action, holdReason) =>
      staffQueueRepository.perform(entry.id, action, role, holdReason, contextFor(entry.queueId)),
  };
}
