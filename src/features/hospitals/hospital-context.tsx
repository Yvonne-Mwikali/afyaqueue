import { createContext, type JSX, type ReactNode, use, useEffect, useState } from "react";

import { useSession } from "@/features/auth/session";
import { hospitalRepository } from "@/lib/backend";
import { readPreference, writePreference } from "@/lib/storage";

import {
  type Hospital,
  type HospitalInvite,
  type HospitalMembership,
  membershipKey,
  PATIENT_WORKSPACE,
  resolveWorkspace,
} from "./hospital";

/** Which context the account is using right now (never a permission). */
export type Mode = "patient" | "member" | "choose";

type HospitalContextValue = {
  /** "loading" until memberships and hospitals are known for this user. */
  status: "loading" | "ready" | "error";
  hospitals: readonly Hospital[];
  /** Active professional memberships (staff/doctor/admin), any hospital. */
  memberships: readonly HospitalMembership[];
  mode: Mode;
  /** The professional workspace in use; null in patient mode. */
  workspace: HospitalMembership | null;
  /** Patient mode's hospital (any user can be a patient anywhere). */
  patientHospital: Hospital | null;
  /** Recently used patient hospitals, most recent first. */
  recentHospitalIds: readonly string[];
  chooseWorkspace: (membership: HospitalMembership) => void;
  choosePatientMode: () => void;
  choosePatientHospital: (hospital: Hospital) => Promise<void>;
  /** Opens the workspace picker; `cancelSwitch` returns to where you were. */
  switchWorkspace: () => void;
  cancelSwitch: (() => void) | null;
  /** Pending invitations for the signed-in email (hidden after "Not now"). */
  invites: readonly HospitalInvite[];
  acceptInvite: (invite: HospitalInvite) => Promise<void>;
  dismissInvites: () => void;
  retry: () => void;
};

const HospitalContext = createContext<HospitalContextValue | null>(null);

const workspaceKey = (uid: string): string => `workspace:${uid}`;
const hospitalKey = (uid: string): string => `patient-hospital:${uid}`;
const recentKey = (uid: string): string => `recent-hospitals:${uid}`;
const RECENT_MAX = 5;

type Selection = { mode: Mode; workspace: HospitalMembership | null };

type State = {
  uid: string | null;
  status: HospitalContextValue["status"];
  hospitals: Hospital[];
  memberships: HospitalMembership[];
  selection: Selection;
  /** Where "Cancel" goes back to while switching. */
  previous: Selection | null;
  patientHospital: Hospital | null;
  recent: string[];
};

const EMPTY: State = {
  uid: null,
  status: "loading",
  hospitals: [],
  memberships: [],
  selection: { mode: "choose", workspace: null },
  previous: null,
  patientHospital: null,
  recent: [],
};

/**
 * Who is signed in is separate from which context they're in. Every account
 * has Patient mode (at any active hospital) plus one workspace per active
 * hospital membership. The app restores the last valid choice, picks
 * automatically only when there's exactly one option, and otherwise asks.
 * Choices live on the device; they never change roles or memberships.
 */
export function HospitalProvider({ children }: { children: ReactNode }): JSX.Element {
  const { user } = useSession();
  const uid = user?.id ?? null;
  const email = user?.email ?? null;
  const [state, setState] = useState<State>(EMPTY);
  const [attempt, setAttempt] = useState(0);
  const [invites, setInvites] = useState<{ email: string | null; list: HospitalInvite[] }>({
    email: null,
    list: [],
  });
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);

  // Invitations for this account's email (claimable once it's verified).
  useEffect(() => {
    if (!email) return;
    return hospitalRepository.watchMyInvites(
      email,
      (list) => setInvites({ email, list }),
      () => setInvites({ email, list: [] })
    );
  }, [email]);

  useEffect(() => {
    // A previous user's state is never shown: `value` masks it until this
    // user's own state arrives (state.uid !== uid).
    if (!uid) return;
    let cancelled = false;
    let hospitals: Hospital[] | null = null;
    let memberships: HospitalMembership[] | null = null;

    const settle = async (): Promise<void> => {
      if (!hospitals || !memberships || cancelled) return;
      const [savedWorkspace, savedHospital, savedRecent] = await Promise.all([
        readPreference(workspaceKey(uid)),
        readPreference(hospitalKey(uid)),
        readPreference(recentKey(uid)),
      ]);
      if (cancelled) return;
      // Restore only what is still valid (deactivated memberships fall back).
      const resolved = resolveWorkspace(memberships, savedWorkspace);
      const selection: Selection = !resolved
        ? { mode: "choose", workspace: null }
        : resolved.mode === "member"
          ? { mode: "member", workspace: resolved.membership }
          : { mode: "patient", workspace: null };
      const patientHospital =
        hospitals.find((hospital) => hospital.id === savedHospital) ??
        (hospitals.length === 1 ? (hospitals[0] ?? null) : null);
      // The interaction link patient rules need; created when first used.
      if (patientHospital && selection.mode === "patient") {
        await hospitalRepository.joinAsPatient(patientHospital.id, uid);
      }
      if (cancelled) return;
      setState((current) => ({
        uid,
        status: "ready",
        hospitals: hospitals ?? [],
        memberships: memberships ?? [],
        // Keep an in-progress switch; otherwise apply the resolved choice.
        selection: current.uid === uid && current.previous ? current.selection : selection,
        previous: current.uid === uid ? current.previous : null,
        patientHospital,
        recent: (savedRecent ?? "").split(",").filter(Boolean),
      }));
    };
    const fail = (): void => {
      if (!cancelled) setState((current) => ({ ...current, uid, status: "error" }));
    };

    hospitalRepository.listActive().then((list) => {
      hospitals = list;
      settle().catch(fail);
    }, fail);
    const stop = hospitalRepository.watchMemberships(
      uid,
      (list) => {
        memberships = list;
        settle().catch(fail);
      },
      fail
    );
    return () => {
      cancelled = true;
      stop();
    };
  }, [uid, attempt]);

  const current = state.uid === uid ? state : EMPTY;

  const select = (selection: Selection, key: string): void => {
    if (!uid) return;
    void writePreference(workspaceKey(uid), key);
    setState((s) => ({ ...s, selection, previous: null }));
  };

  const value: HospitalContextValue = {
    status: current.status,
    hospitals: current.hospitals,
    memberships: current.memberships,
    mode: current.selection.mode,
    workspace: current.selection.mode === "member" ? current.selection.workspace : null,
    patientHospital: current.patientHospital,
    recentHospitalIds: current.recent,
    chooseWorkspace: (membership) =>
      select({ mode: "member", workspace: membership }, membershipKey(membership)),
    choosePatientMode: () => {
      select({ mode: "patient", workspace: null }, PATIENT_WORKSPACE);
      if (uid && current.patientHospital) {
        void hospitalRepository
          .joinAsPatient(current.patientHospital.id, uid)
          .catch(() => undefined);
      }
    },
    choosePatientHospital: async (hospital) => {
      if (!uid) return;
      await hospitalRepository.joinAsPatient(hospital.id, uid);
      const recent = [hospital.id, ...current.recent.filter((id) => id !== hospital.id)].slice(
        0,
        RECENT_MAX
      );
      void writePreference(hospitalKey(uid), hospital.id);
      void writePreference(recentKey(uid), recent.join(","));
      setState((s) => ({ ...s, patientHospital: hospital, recent }));
    },
    switchWorkspace: () =>
      setState((s) => ({
        ...s,
        previous: s.selection,
        selection: { mode: "choose", workspace: null },
      })),
    cancelSwitch: current.previous
      ? () => setState((s) => (s.previous ? { ...s, selection: s.previous, previous: null } : s))
      : null,
    invites:
      invites.email === email && dismissedFor !== uid
        ? invites.list.filter(
            (invite) => !current.memberships.some((m) => m.hospitalId === invite.hospitalId)
          )
        : [],
    acceptInvite: async (invite) => {
      if (!user) return;
      await hospitalRepository.claimInvite(invite, {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
      });
      // The new membership arrives through watchMemberships.
    },
    dismissInvites: () => setDismissedFor(uid),
    retry: () => {
      setState({ ...EMPTY, uid });
      setAttempt((count) => count + 1);
    },
  };

  return <HospitalContext value={value}>{children}</HospitalContext>;
}

export function useHospitalContext(): HospitalContextValue {
  const context = use(HospitalContext);
  if (!context) throw new Error("useHospitalContext must be used inside HospitalProvider.");
  return context;
}

/**
 * The hospital queries are scoped to right now: the professional
 * workspace's hospital, or Patient mode's hospital. null until chosen.
 */
export function useActiveHospitalId(): string | null {
  const { mode, workspace, patientHospital } = useHospitalContext();
  if (mode === "member") return workspace?.hospitalId ?? null;
  if (mode === "patient") return patientHospital?.id ?? null;
  return null;
}
