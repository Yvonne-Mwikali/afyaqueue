// Creates missing slot locks for booked appointments made before slot locks
// existed (see src/features/appointments/slot-locks.ts).
//
//   node scripts/backfill-slot-locks.mjs
//
// Idempotent: existing locks are left alone. A lock already held by a
// different appointment is reported as a conflict for staff to resolve.
import { getFirestore, Timestamp } from "firebase-admin/firestore";

import { adminApp, PROJECT_ID } from "./lib/admin.mjs";

const BLOCK_MS = 15 * 60_000;
const db = getFirestore(adminApp());

const booked = await db.collection("appointments").where("status", "==", "booked").get();
let created = 0;
const conflicts = [];

for (const appointment of booked.docs) {
  const { patientId, doctorId, scheduledAt, durationMinutes } = appointment.data();
  const start = scheduledAt.toMillis();
  const locks = [
    [
      db.collection("patientSlots").doc(`${patientId}_${start}`),
      { patientId, startAt: scheduledAt },
    ],
  ];
  if (doctorId) {
    for (let i = 0; i < Math.ceil(durationMinutes / 15); i++) {
      const ms = start + i * BLOCK_MS;
      locks.push([
        db.collection("doctorSlots").doc(`${doctorId}_${ms}`),
        { doctorId, startAt: Timestamp.fromMillis(ms) },
      ]);
    }
  }
  for (const [ref, data] of locks) {
    const existing = await ref.get();
    if (!existing.exists) {
      await ref.create({ ...data, appointmentId: appointment.id });
      created++;
    } else if (existing.get("appointmentId") !== appointment.id) {
      conflicts.push(
        `${ref.path} (held by ${existing.get("appointmentId")}, wanted by ${appointment.id})`
      );
    }
  }
}

console.log(
  `✔ ${booked.size} booked appointments checked in ${PROJECT_ID}; ${created} locks created.`
);
if (conflicts.length > 0)
  console.log(`  Conflicts (already double-booked):\n  ${conflicts.join("\n  ")}`);
process.exit(0);
