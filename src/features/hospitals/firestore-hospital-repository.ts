import {
  collection,
  doc,
  getDoc,
  type DocumentData,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";

import { COLLECTIONS, firestore } from "@/lib/firebase/firestore";

import { FirebaseError } from "firebase/app";

import { AppError } from "@/lib/app-error";

import {
  type Hospital,
  type HospitalInvite,
  type HospitalMembership,
  type MemberRole,
  normalizeEmail,
} from "./hospital";
import type { HospitalRepository } from "./hospital-repository";

const ROLES: readonly MemberRole[] = ["staff", "doctor", "admin"];

const OPTIONAL_TEXT = [
  "shortName",
  "location",
  "phone",
  "supportPhone",
  "emergencyPhone",
  "email",
] as const;

function parseHospital(id: string, data: DocumentData): Hospital | null {
  if (typeof data.name !== "string") return null;
  const hospital: Hospital = { id, name: data.name };
  for (const key of OPTIONAL_TEXT) {
    const value: unknown = data[key];
    // Empty strings mean "not provided": leave the field out.
    if (typeof value === "string" && value.trim() !== "") hospital[key] = value.trim();
  }
  return hospital;
}

export const firestoreHospitalRepository: HospitalRepository = {
  listActive: async () => {
    const snapshot = await getDocs(
      query(collection(firestore(), COLLECTIONS.hospitals), where("active", "==", true))
    );
    return snapshot.docs
      .flatMap((hospital) => parseHospital(hospital.id, hospital.data()) ?? [])
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  watchHospital: (hospitalId, onChange, onError) =>
    onSnapshot(
      doc(firestore(), COLLECTIONS.hospitals, hospitalId),
      (snapshot) =>
        onChange(snapshot.exists() ? parseHospital(snapshot.id, snapshot.data()) : null),
      onError
    ),

  watchMemberships: (userId, onChange, onError) =>
    onSnapshot(
      query(
        collection(firestore(), COLLECTIONS.hospitalMembers),
        where("userId", "==", userId),
        where("active", "==", true)
      ),
      (snapshot) =>
        onChange(
          snapshot.docs.flatMap((member): HospitalMembership[] => {
            const { hospitalId, role, doctorId } = member.data();
            if (typeof hospitalId !== "string" || !ROLES.includes(role)) return [];
            return [
              {
                hospitalId,
                userId,
                role,
                doctorId: typeof doctorId === "string" ? doctorId : null,
              },
            ];
          })
        ),
      onError
    ),

  joinAsPatient: async (hospitalId, userId) => {
    const ref = doc(firestore(), COLLECTIONS.hospitalPatients, `${hospitalId}_${userId}`);
    // Create once; rules don't allow overwriting.
    if ((await getDoc(ref)).exists()) return;
    await setDoc(ref, { hospitalId, userId, createdAt: serverTimestamp() });
  },

  watchMyInvites: (email, onChange, onError) =>
    onSnapshot(
      query(
        collection(firestore(), COLLECTIONS.hospitalInvites),
        where("email", "==", normalizeEmail(email)),
        where("status", "==", "pending")
      ),
      (snapshot) => onChange(snapshot.docs.flatMap((d) => parseInvite(d.id, d.data()) ?? [])),
      onError
    ),

  claimInvite: async (invite, user) => {
    const db = firestore();
    const batch = writeBatch(db);
    batch.update(doc(db, COLLECTIONS.hospitalInvites, invite.id), {
      status: "accepted",
      acceptedAt: serverTimestamp(),
      acceptedBy: user.id,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, COLLECTIONS.hospitalMembers, `${invite.hospitalId}_${user.id}`), {
      hospitalId: invite.hospitalId,
      userId: user.id,
      role: invite.role,
      doctorId: invite.doctorId,
      active: true,
      displayName: user.displayName,
      email: normalizeEmail(user.email),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    if (invite.role === "doctor" && invite.doctorId) {
      batch.update(doc(db, COLLECTIONS.doctors, invite.doctorId), {
        userId: user.id,
        updatedAt: serverTimestamp(),
      });
    }
    try {
      await batch.commit();
    } catch (error) {
      const code = error instanceof FirebaseError ? error.code : "";
      if (code === "permission-denied") {
        throw new AppError(
          "This invitation can't be accepted. Make sure your email is verified, or ask your hospital admin to check it."
        );
      }
      throw new AppError("Something went wrong. Please try again.");
    }
  },
};

const INVITE_ROLES: readonly MemberRole[] = ["staff", "doctor", "admin"];

export function parseInvite(id: string, data: DocumentData): HospitalInvite | null {
  const { hospitalId, email, role, doctorId, doctorName, status, createdAt } = data;
  if (typeof hospitalId !== "string" || typeof email !== "string" || !INVITE_ROLES.includes(role)) {
    return null;
  }
  return {
    id,
    hospitalId,
    email,
    role,
    doctorId: typeof doctorId === "string" ? doctorId : null,
    doctorName: typeof doctorName === "string" ? doctorName : "",
    status: status === "accepted" || status === "revoked" ? status : "pending",
    createdAt: createdAt instanceof Timestamp ? createdAt.toDate() : null,
  };
}
