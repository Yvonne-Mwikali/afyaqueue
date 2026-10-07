import { FirebaseError } from "firebase/app";
import {
  collection,
  collectionGroup,
  doc,
  type DocumentData,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  type WriteBatch,
  writeBatch,
} from "firebase/firestore";

import { parseInvite } from "@/features/hospitals/firestore-hospital-repository";
import {
  type HospitalInvite,
  inviteId,
  type MemberRole,
  normalizeEmail,
} from "@/features/hospitals/hospital";
import type { QueueAction } from "@/features/queues/queue-actions";
import { AppError } from "@/lib/app-error";
import { firebaseAuth } from "@/lib/firebase/auth";
import { COLLECTIONS, firestore } from "@/lib/firebase/firestore";

import type {
  AdminDoctor,
  AdminLink,
  AdminMember,
  AdminRepository,
  AdminService,
  AuditEvent,
} from "./admin";

const str = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

function uid(): string {
  const id = firebaseAuth().currentUser?.uid;
  if (!id) throw new AppError("Please sign in again.");
  return id;
}

async function guard<T>(work: Promise<T>): Promise<T> {
  try {
    return await work;
  } catch (error) {
    if (error instanceof AppError) throw error;
    const code = error instanceof FirebaseError ? error.code : "";
    if (code === "permission-denied") {
      throw new AppError("You don't have permission to change this here.");
    }
    if (code === "unavailable")
      throw new AppError("No connection. Check your internet and try again.");
    throw new AppError("Something went wrong. Please try again.");
  }
}

function watchList<T>(
  name: string,
  hospitalId: string,
  parse: (id: string, data: DocumentData) => T | null,
  onChange: (items: T[]) => void,
  onError: (error: unknown) => void
): () => void {
  return onSnapshot(
    query(collection(firestore(), name), where("hospitalId", "==", hospitalId)),
    (snapshot) => onChange(snapshot.docs.flatMap((d) => parse(d.id, d.data()) ?? [])),
    onError
  );
}

/** URL-safe id from a name, plus a short random suffix (ids are global). */
function newId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
  return `${slug || "item"}-${Math.random().toString(36).slice(2, 7)}`;
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Adds the invite write (new or re-issued) to a batch. */
function writeInvite(
  batch: WriteBatch,
  hospitalId: string,
  rawEmail: string,
  role: MemberRole,
  doctor: { id: string; name: string } | null,
  existing: HospitalInvite | undefined
): void {
  const email = normalizeEmail(rawEmail);
  if (!EMAIL.test(email)) throw new AppError("Enter a valid email address.");
  if (existing?.status === "accepted") {
    throw new AppError("This person already accepted an invitation to this hospital.");
  }
  const ref = doc(firestore(), COLLECTIONS.hospitalInvites, inviteId(hospitalId, email));
  const details = {
    role,
    doctorId: doctor?.id ?? null,
    doctorName: doctor?.name ?? "",
    status: "pending",
    updatedAt: serverTimestamp(),
  };
  if (existing) batch.update(ref, details);
  else {
    batch.set(ref, {
      hospitalId,
      email,
      ...details,
      createdBy: uid(),
      createdAt: serverTimestamp(),
    });
  }
}

export const firestoreAdminRepository: AdminRepository = {
  watchInvites: (hospitalId, onChange, onError) =>
    watchList(
      COLLECTIONS.hospitalInvites,
      hospitalId,
      parseInvite,
      (invites) =>
        onChange(
          invites.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
        ),
      onError
    ),

  invite: (hospitalId, email, role, doctor, existing) => {
    const batch = writeBatch(firestore());
    writeInvite(batch, hospitalId, email, role, doctor, existing);
    return guard(batch.commit());
  },

  revokeInvite: (id) => {
    const batch = writeBatch(firestore());
    batch.update(doc(firestore(), COLLECTIONS.hospitalInvites, id), {
      status: "revoked",
      updatedAt: serverTimestamp(),
    });
    return guard(batch.commit());
  },

  createDoctor: async (hospitalId, input, existingInvites) => {
    const db = firestore();
    const id = newId(input.name);
    const batch = writeBatch(db);
    batch.set(doc(db, COLLECTIONS.doctors, id), {
      hospitalId,
      name: input.name,
      specialty: input.specialty,
      hospital: input.hospital,
      active: input.active,
      sortOrder: 1000,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    for (const serviceId of input.serviceIds) {
      batch.set(doc(db, COLLECTIONS.doctorServices, `${id}_${serviceId}`), {
        hospitalId,
        doctorId: id,
        serviceId,
        active: true,
        updatedAt: serverTimestamp(),
      });
    }
    for (const window of input.windows) {
      batch.set(
        doc(
          db,
          COLLECTIONS.doctorSchedules,
          `${id}_${window.dayOfWeek}_${window.startTime.replace(":", "")}`
        ),
        {
          hospitalId,
          doctorId: id,
          ...window,
          active: true,
          updatedAt: serverTimestamp(),
        }
      );
    }
    if (input.inviteEmail.trim()) {
      const email = normalizeEmail(input.inviteEmail);
      writeInvite(
        batch,
        hospitalId,
        email,
        "doctor",
        { id, name: input.name },
        existingInvites.find((invite) => invite.email === email)
      );
    }
    await guard(batch.commit());
    return id;
  },

  watchMembers: (hospitalId, onChange, onError) =>
    watchList(
      COLLECTIONS.hospitalMembers,
      hospitalId,
      (id, d): AdminMember | null =>
        d.role === "staff" || d.role === "doctor" || d.role === "admin"
          ? {
              id,
              userId: str(d.userId),
              displayName: str(d.displayName),
              email: str(d.email),
              role: d.role,
              active: d.active === true,
              doctorId: typeof d.doctorId === "string" ? d.doctorId : null,
            }
          : null,
      (members) => onChange(members.sort((a, b) => a.displayName.localeCompare(b.displayName))),
      onError
    ),

  updateMember: (memberId, patch) => {
    const batch = writeBatch(firestore());
    batch.update(doc(firestore(), COLLECTIONS.hospitalMembers, memberId), {
      ...patch,
      ...(patch.role ? { doctorId: null } : {}),
      updatedAt: serverTimestamp(),
      updatedBy: uid(),
    });
    return guard(batch.commit());
  },

  watchDoctors: (hospitalId, onChange, onError) =>
    watchList(
      COLLECTIONS.doctors,
      hospitalId,
      (id, d): AdminDoctor | null =>
        typeof d.name === "string"
          ? {
              id,
              name: d.name,
              specialty: str(d.specialty),
              hospital: str(d.hospital),
              active: d.active === true,
              userId: typeof d.userId === "string" ? d.userId : null,
            }
          : null,
      (doctors) => onChange(doctors.sort((a, b) => a.name.localeCompare(b.name))),
      onError
    ),

  saveDoctor: async (hospitalId, doctorId, input) => {
    const id = doctorId ?? newId(input.name);
    const batch = writeBatch(firestore());
    batch.set(
      doc(firestore(), COLLECTIONS.doctors, id),
      {
        ...input,
        hospitalId,
        ...(doctorId ? {} : { createdAt: serverTimestamp(), sortOrder: 1000 }),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    await guard(batch.commit());
    return id;
  },

  linkDoctorAccount: (hospitalId, doctorId, member) => {
    const db = firestore();
    const batch = writeBatch(db);
    batch.update(doc(db, COLLECTIONS.doctors, doctorId), {
      userId: member.userId,
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, COLLECTIONS.hospitalMembers, member.id), {
      role: "doctor",
      doctorId,
      active: true,
      updatedAt: serverTimestamp(),
      updatedBy: uid(),
    });
    return guard(batch.commit());
  },

  unlinkDoctorAccount: (_hospitalId, doctorId, member) => {
    const db = firestore();
    const batch = writeBatch(db);
    batch.update(doc(db, COLLECTIONS.doctors, doctorId), {
      userId: null,
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, COLLECTIONS.hospitalMembers, member.id), {
      role: "staff",
      doctorId: null,
      updatedAt: serverTimestamp(),
      updatedBy: uid(),
    });
    return guard(batch.commit());
  },

  watchServices: (hospitalId, onChange, onError) =>
    watchList(
      COLLECTIONS.services,
      hospitalId,
      (id, d): AdminService | null =>
        typeof d.name === "string"
          ? {
              id,
              name: d.name,
              description: str(d.description),
              category:
                d.category === "specialty" || d.category === "diagnostic" ? d.category : "primary",
              icon: str(d.icon, "medical-bag"),
              providerTitle: str(d.providerTitle),
              durationMinutes: typeof d.durationMinutes === "number" ? d.durationMinutes : 30,
              modes: Array.isArray(d.modes) ? d.modes : ["in-clinic"],
              active: d.active === true,
              sortOrder: typeof d.sortOrder === "number" ? d.sortOrder : 1000,
            }
          : null,
      (services) => onChange(services.sort((a, b) => a.sortOrder - b.sortOrder)),
      onError
    ),

  saveService: async (hospitalId, serviceId, input) => {
    const id = serviceId ?? newId(input.name);
    const batch = writeBatch(firestore());
    batch.set(
      doc(firestore(), COLLECTIONS.services, id),
      {
        ...input,
        hospitalId,
        ...(serviceId ? {} : { createdAt: serverTimestamp() }),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    await guard(batch.commit());
    return id;
  },

  watchLinks: (hospitalId, onChange, onError) =>
    watchList(
      COLLECTIONS.doctorServices,
      hospitalId,
      (_id, d): AdminLink | null =>
        typeof d.doctorId === "string" && typeof d.serviceId === "string"
          ? { doctorId: d.doctorId, serviceId: d.serviceId, active: d.active === true }
          : null,
      onChange,
      onError
    ),

  setLink: (hospitalId, doctorId, serviceId, active) => {
    const batch = writeBatch(firestore());
    batch.set(
      doc(firestore(), COLLECTIONS.doctorServices, `${doctorId}_${serviceId}`),
      { hospitalId, doctorId, serviceId, active, updatedAt: serverTimestamp() },
      { merge: true }
    );
    return guard(batch.commit());
  },

  watchSchedule: (hospitalId, doctorId, onChange, onError) =>
    onSnapshot(
      query(
        collection(firestore(), COLLECTIONS.doctorSchedules),
        where("hospitalId", "==", hospitalId),
        where("doctorId", "==", doctorId)
      ),
      (snapshot) =>
        onChange(
          snapshot.docs
            .filter((d) => d.get("active") === true)
            .map((d) => ({
              dayOfWeek: Number(d.get("dayOfWeek")),
              startTime: str(d.get("startTime")),
              endTime: str(d.get("endTime")),
            }))
        ),
      onError
    ),

  saveSchedule: async (hospitalId, doctorId, windows) => {
    const db = firestore();
    const existing = await guard(
      getDocs(
        query(
          collection(db, COLLECTIONS.doctorSchedules),
          where("hospitalId", "==", hospitalId),
          where("doctorId", "==", doctorId)
        )
      )
    );
    const batch = writeBatch(db);
    const keep = new Set<string>();
    for (const window of windows) {
      const id = `${doctorId}_${window.dayOfWeek}_${window.startTime.replace(":", "")}`;
      keep.add(id);
      batch.set(doc(db, COLLECTIONS.doctorSchedules, id), {
        hospitalId,
        doctorId,
        ...window,
        active: true,
        updatedAt: serverTimestamp(),
      });
    }
    // Weekly windows aren't history: removed ones are deleted.
    existing.docs.filter((d) => !keep.has(d.id)).forEach((d) => batch.delete(d.ref));
    await guard(batch.commit());
  },

  watchHospital: (hospitalId, onChange, onError) =>
    onSnapshot(
      doc(firestore(), COLLECTIONS.hospitals, hospitalId),
      (snapshot) =>
        onChange({
          id: snapshot.id,
          name: str(snapshot.get("name")),
          shortName: str(snapshot.get("shortName")),
          location: str(snapshot.get("location")),
          timeZone: str(snapshot.get("timeZone"), "Africa/Nairobi"),
        }),
      onError
    ),

  updateHospital: (hospitalId, input) => {
    const batch = writeBatch(firestore());
    batch.update(doc(firestore(), COLLECTIONS.hospitals, hospitalId), {
      ...input,
      updatedAt: serverTimestamp(),
    });
    return guard(batch.commit());
  },

  watchAudit: (hospitalId, since, onChange, onError) =>
    onSnapshot(
      query(
        collectionGroup(firestore(), "events"),
        where("hospitalId", "==", hospitalId),
        where("at", ">=", Timestamp.fromDate(since)),
        orderBy("at", "desc")
      ),
      (snapshot) =>
        onChange(
          snapshot.docs.map((d): AuditEvent => {
            const at = d.get("at");
            return {
              id: d.ref.path,
              action: d.get("action") as QueueAction,
              from: str(d.get("from")),
              to: str(d.get("to")),
              at: at instanceof Timestamp ? at.toDate() : null,
              by: str(d.get("by")),
              byRole: d.get("byRole") as MemberRole,
              queueId: str(d.get("queueId")),
              queueNumber: Number(d.get("queueNumber") ?? 0),
              patientName: str(d.get("patientName")),
            };
          })
        ),
      onError
    ),
};
