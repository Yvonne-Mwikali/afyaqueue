import type { HospitalInvite, MemberRole } from "@/features/hospitals/hospital";
import type { QueueAction } from "@/features/queues/queue-actions";
import type { ServiceCategory, ServiceMode } from "@/features/services/service-catalog";

/** Admin-facing records include inactive ones (patients only ever see active). */
export type AdminMember = {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  role: MemberRole;
  active: boolean;
  doctorId: string | null;
};

export type AdminDoctor = {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  active: boolean;
  userId: string | null;
};

export type AdminService = {
  id: string;
  name: string;
  description: string;
  category: ServiceCategory;
  icon: string;
  providerTitle: string;
  durationMinutes: number;
  modes: ServiceMode[];
  active: boolean;
  sortOrder: number;
};

export type AdminLink = { doctorId: string; serviceId: string; active: boolean };

export type AdminWindow = { dayOfWeek: number; startTime: string; endTime: string };

export type AdminHospital = {
  id: string;
  name: string;
  shortName: string;
  location: string;
  timeZone: string;
};

export type AuditEvent = {
  id: string;
  action: QueueAction;
  from: string;
  to: string;
  at: Date | null;
  by: string;
  byRole: MemberRole;
  queueId: string;
  queueNumber: number;
  patientName: string;
};

export type ServiceInput = Omit<AdminService, "id">;
export type DoctorInput = Pick<AdminDoctor, "name" | "specialty" | "hospital" | "active">;

/** Everything "Add doctor" saves in one go. */
export type NewDoctorInput = DoctorInput & {
  serviceIds: string[];
  windows: AdminWindow[];
  /** Optional: also invite this email to become the doctor's login. */
  inviteEmail: string;
};

/** Default weekly hours offered when adding a doctor. */
export const SCHEDULE_TEMPLATES: { id: string; label: string; windows: AdminWindow[] }[] = [
  {
    id: "weekdays",
    label: "Mon–Fri 08:00–12:00, 13:00–16:00",
    windows: [1, 2, 3, 4, 5].flatMap((dayOfWeek) => [
      { dayOfWeek, startTime: "08:00", endTime: "12:00" },
      { dayOfWeek, startTime: "13:00", endTime: "16:00" },
    ]),
  },
  {
    id: "mornings",
    label: "Mon–Fri 08:00–12:00",
    windows: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
      dayOfWeek,
      startTime: "08:00",
      endTime: "12:00",
    })),
  },
  { id: "later", label: "Set hours later", windows: [] },
];

export interface AdminRepository {
  watchInvites(
    hospitalId: string,
    onChange: (i: HospitalInvite[]) => void,
    onError: (e: unknown) => void
  ): () => void;
  /**
   * Creates an invitation, or re-issues an earlier pending/revoked one for
   * the same email (role/doctor may change). Accepted ones can't be reused.
   */
  invite(
    hospitalId: string,
    email: string,
    role: MemberRole,
    doctor: { id: string; name: string } | null,
    existing: HospitalInvite | undefined
  ): Promise<void>;
  revokeInvite(inviteId: string): Promise<void>;
  /** Doctor record + services + weekly hours (+ invitation) in one batch. */
  createDoctor(
    hospitalId: string,
    input: NewDoctorInput,
    existingInvites: readonly HospitalInvite[]
  ): Promise<string>;
  watchMembers(
    hospitalId: string,
    onChange: (m: AdminMember[]) => void,
    onError: (e: unknown) => void
  ): () => void;
  updateMember(
    memberId: string,
    patch: { role?: "staff" | "admin"; active?: boolean }
  ): Promise<void>;
  watchDoctors(
    hospitalId: string,
    onChange: (d: AdminDoctor[]) => void,
    onError: (e: unknown) => void
  ): () => void;
  saveDoctor(hospitalId: string, doctorId: string | null, input: DoctorInput): Promise<string>;
  /** Links a doctor record to a member's account (membership becomes role doctor). */
  linkDoctorAccount(hospitalId: string, doctorId: string, member: AdminMember): Promise<void>;
  unlinkDoctorAccount(hospitalId: string, doctorId: string, member: AdminMember): Promise<void>;
  watchServices(
    hospitalId: string,
    onChange: (s: AdminService[]) => void,
    onError: (e: unknown) => void
  ): () => void;
  saveService(hospitalId: string, serviceId: string | null, input: ServiceInput): Promise<string>;
  watchLinks(
    hospitalId: string,
    onChange: (l: AdminLink[]) => void,
    onError: (e: unknown) => void
  ): () => void;
  setLink(hospitalId: string, doctorId: string, serviceId: string, active: boolean): Promise<void>;
  watchSchedule(
    hospitalId: string,
    doctorId: string,
    onChange: (w: AdminWindow[]) => void,
    onError: (e: unknown) => void
  ): () => void;
  /** Replaces the doctor's weekly windows with exactly these. */
  saveSchedule(hospitalId: string, doctorId: string, windows: AdminWindow[]): Promise<void>;
  watchHospital(
    hospitalId: string,
    onChange: (h: AdminHospital) => void,
    onError: (e: unknown) => void
  ): () => void;
  updateHospital(hospitalId: string, input: Omit<AdminHospital, "id">): Promise<void>;
  watchAudit(
    hospitalId: string,
    since: Date,
    onChange: (events: AuditEvent[]) => void,
    onError: (e: unknown) => void
  ): () => void;
}

/** "08:00" style, and windows that don't overlap within a day. */
export function scheduleProblem(windows: readonly AdminWindow[]): string | null {
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  for (const window of windows) {
    if (!time.test(window.startTime) || !time.test(window.endTime)) {
      return "Use 24-hour times like 08:00.";
    }
    if (window.endTime <= window.startTime) return "Each window must end after it starts.";
  }
  for (let day = 0; day < 7; day++) {
    const ordered = windows
      .filter((window) => window.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (let i = 1; i < ordered.length; i++) {
      const previous = ordered[i - 1];
      const current = ordered[i];
      if (previous && current && current.startTime < previous.endTime) {
        return "Windows on the same day can't overlap.";
      }
    }
  }
  return null;
}
