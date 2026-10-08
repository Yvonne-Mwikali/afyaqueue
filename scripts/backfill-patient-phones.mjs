// Copies each patient's profile phone onto their *upcoming* appointments
// (booked or checked in) and those appointments' active queue entries
// (patientPhone), for "Call patient". New bookings copy it themselves.
//
//   node scripts/backfill-patient-phones.mjs
//
// Idempotent: documents that already have patientPhone are left alone.
// Finished visits are not touched (staff only need it while a visit is open).
// Prints counts only, never numbers.
import { getFirestore } from "firebase-admin/firestore";

import { adminApp, PROJECT_ID } from "./lib/admin.mjs";

const db = getFirestore(adminApp());
const phones = new Map();
const OPEN_APPOINTMENTS = ["booked", "checked-in"];
const OPEN_ENTRIES = ["waiting", "called", "held", "in-service"];

async function phoneOf(patientId) {
  if (!phones.has(patientId)) {
    const profile = await db.collection("users").doc(patientId).get();
    const phone = profile.get("phone");
    phones.set(patientId, typeof phone === "string" ? phone : "");
  }
  return phones.get(patientId);
}

let appointments = 0;
for (const doc of (
  await db.collection("appointments").where("status", "in", OPEN_APPOINTMENTS).get()
).docs) {
  if (typeof doc.get("patientPhone") === "string") continue;
  await doc.ref.update({ patientPhone: await phoneOf(doc.get("patientId")) });
  appointments++;
}

let entries = 0;
for (const doc of (await db.collection("queueEntries").where("status", "in", OPEN_ENTRIES).get())
  .docs) {
  if (typeof doc.get("patientPhone") === "string") continue;
  const appointment = await db.collection("appointments").doc(doc.get("appointmentId")).get();
  const phone = appointment.get("patientPhone") ?? (await phoneOf(doc.get("patientId")));
  await doc.ref.update({ patientPhone: String(phone) });
  entries++;
}

console.log(
  `✔ ${PROJECT_ID}: patientPhone added to ${appointments} appointments and ${entries} queue entries.`
);
process.exit(0);
