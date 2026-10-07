// Copies each patient's display name onto their appointments and queue
// entries (patientName), for documents created before staff screens used it.
//
//   node scripts/backfill-patient-names.mjs
//
// Idempotent: documents that already have a patientName are left alone.
// Only the display name is copied, never contact details.
import { getFirestore } from "firebase-admin/firestore";

import { adminApp, PROJECT_ID } from "./lib/admin.mjs";

const db = getFirestore(adminApp());
const names = new Map();

async function nameOf(patientId) {
  if (!names.has(patientId)) {
    const profile = await db.collection("users").doc(patientId).get();
    names.set(patientId, String(profile.get("fullName") ?? ""));
  }
  return names.get(patientId);
}

let appointments = 0;
for (const doc of (await db.collection("appointments").get()).docs) {
  if (typeof doc.get("patientName") === "string") continue;
  await doc.ref.update({ patientName: await nameOf(doc.get("patientId")) });
  appointments++;
}

let entries = 0;
for (const doc of (await db.collection("queueEntries").get()).docs) {
  if (typeof doc.get("patientName") === "string") continue;
  const appointment = await db.collection("appointments").doc(doc.get("appointmentId")).get();
  const name = appointment.get("patientName") ?? (await nameOf(doc.get("patientId")));
  await doc.ref.update({ patientName: String(name) });
  entries++;
}

console.log(
  `✔ ${PROJECT_ID}: patientName added to ${appointments} appointments and ${entries} queue entries.`
);
process.exit(0);
