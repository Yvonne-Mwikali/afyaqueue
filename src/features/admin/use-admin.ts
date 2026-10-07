import { useCallback, useEffect, useState } from "react";

import type { HospitalInvite } from "@/features/hospitals/hospital";
import { useActiveHospitalId } from "@/features/hospitals/hospital-context";
import { adminRepository } from "@/lib/backend";

import type {
  AdminDoctor,
  AdminHospital,
  AdminLink,
  AdminMember,
  AdminRepository,
  AdminService,
  AdminWindow,
  AuditEvent,
} from "./admin";

type Live<T> = { status: "loading" | "ready" | "error"; data: T };

type Watch<T> = (
  hospitalId: string,
  onChange: (data: T) => void,
  onError: (error: unknown) => void
) => () => void;

/** A live admin feed for the active hospital; `watch` must be stable. */
function useAdminWatch<T>(watch: Watch<T>, initial: T): Live<T> {
  const hospitalId = useActiveHospitalId();
  const [state, setState] = useState<
    Live<T> & { source: Watch<T> | null; hospitalId: string | null }
  >({ status: "loading", data: initial, source: null, hospitalId: null });
  useEffect(() => {
    if (!hospitalId) return;
    return watch(
      hospitalId,
      (data) => setState({ status: "ready", data, source: watch, hospitalId }),
      () => setState((current) => ({ ...current, status: "error", source: watch, hospitalId }))
    );
  }, [hospitalId, watch]);
  // Until this feed answers for this hospital, show loading (never stale data).
  return state.source === watch && state.hospitalId === hospitalId
    ? state
    : { status: "loading", data: initial };
}

const NONE: never[] = [];

export const useAdminMembers = (): Live<AdminMember[]> =>
  useAdminWatch<AdminMember[]>(adminRepository.watchMembers, NONE);
export const useAdminDoctors = (): Live<AdminDoctor[]> =>
  useAdminWatch<AdminDoctor[]>(adminRepository.watchDoctors, NONE);
export const useAdminServices = (): Live<AdminService[]> =>
  useAdminWatch<AdminService[]>(adminRepository.watchServices, NONE);
export const useAdminLinks = (): Live<AdminLink[]> =>
  useAdminWatch<AdminLink[]>(adminRepository.watchLinks, NONE);
export const useAdminInvites = (): Live<HospitalInvite[]> =>
  useAdminWatch<HospitalInvite[]>(adminRepository.watchInvites, NONE);
export const useAdminHospital = (): Live<AdminHospital | null> =>
  useAdminWatch<AdminHospital | null>(adminRepository.watchHospital, null);

export function useAdminSchedule(doctorId: string): Live<AdminWindow[]> {
  const watch = useCallback<Watch<AdminWindow[]>>(
    (h, onChange, onError) => adminRepository.watchSchedule(h, doctorId, onChange, onError),
    [doctorId]
  );
  return useAdminWatch(watch, NONE);
}

export function useAuditEvents(sinceKey: string): Live<AuditEvent[]> {
  const watch = useCallback<Watch<AuditEvent[]>>(
    // `sinceKey` is a local "YYYY-MM-DD"; parse as local midnight.
    (h, onChange, onError) =>
      adminRepository.watchAudit(h, new Date(`${sinceKey}T00:00:00`), onChange, onError),
    [sinceKey]
  );
  return useAdminWatch(watch, NONE);
}

/** Admin writes, with the active hospital. */
export function useAdminActions(): { repo: AdminRepository; hospitalId: string | null } {
  return { repo: adminRepository, hospitalId: useActiveHospitalId() };
}
