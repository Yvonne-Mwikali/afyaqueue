// Moves existing single-hospital development data into the hospital model.
//
//   node scripts/backfill-hospitals.mjs
//
// Idempotent; the second run changes nothing:
// - creates the default hospital from firebase/seed/hospitals.json if missing;
// - sets hospitalId on services, doctors, doctorServices, appointments,
//   queues, queueEntries, doctorSlots and patientSlots that lack one;
// - copies doctorId onto queue entries (doctors see their own queue);
// - links each patient with appointments to the hospital (hospitalPatients);
// - gives existing staff/admin accounts (users.role) a membership there;
// - copies display name/email onto memberships and context onto audit events.
// Nothing is deleted.
import { readFile } from "node:fs/promises";

import { FieldValue, getFirestore } from "firebase-admin/firestore";

import { adminApp, fail, PROJECT_ID } from "./lib/admin.mjs";

const hospitals = JSON.parse(
  await readFile(new URL("../firebase/seed/hospitals.json", import.meta.url), "utf8")
);
const [DEFAULT_HOSPITAL] = Object.keys(hospitals);
if (!DEFAULT_HOSPITAL) fail("firebase/seed/hospitals.json has no hospital.");

const db = getFirestore(adminApp());
const changes = {};
const count = (key) => (changes[key] = (changes[key] ?? 0) + 1);

for (const [id, data] of Object.entries(hospitals)) {
  const ref = db.collection("hospitals").doc(id);
  if (!(await ref.get()).exists) {
    await ref.create({
      ...data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    count("hospitals created");
  }
}

for (const name of [
  "services",
  "doctors",
  "doctorServices",
  "appointments",
  "queues",
  "queueEntries",
  "doctorSlots",
  "patientSlots",
]) {
  for (const doc of (await db.collection(name).get()).docs) {
    if (typeof doc.get("hospitalId") === "string") continue;
    await doc.ref.update({ hospitalId: DEFAULT_HOSPITAL });
    count(`${name}.hospitalId`);
  }
}

for (const entry of (await db.collection("queueEntries").get()).docs) {
  if (entry.get("doctorId") !== undefined) continue;
  const appointment = await db.collection("appointments").doc(entry.get("appointmentId")).get();
  const doctorId = appointment.get("doctorId");
  await entry.ref.update({ doctorId: typeof doctorId === "string" ? doctorId : null });
  count("queueEntries.doctorId");
}

for (const appointment of (await db.collection("appointments").get()).docs) {
  const hospitalId = appointment.get("hospitalId");
  const userId = appointment.get("patientId");
  const ref = db.collection("hospitalPatients").doc(`${hospitalId}_${userId}`);
  if ((await ref.get()).exists) continue;
  await ref.create({ hospitalId, userId, createdAt: FieldValue.serverTimestamp() });
  count("hospitalPatients");
}

for (const user of (await db.collection("users").get()).docs) {
  const role = user.get("role");
  if (role !== "staff" && role !== "admin") continue;
  const ref = db.collection("hospitalMembers").doc(`${DEFAULT_HOSPITAL}_${user.id}`);
  if ((await ref.get()).exists) continue;
  await ref.create({
    hospitalId: DEFAULT_HOSPITAL,
    userId: user.id,
    role,
    doctorId: null,
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  count(`hospitalMembers (${role})`);
}

for (const member of (await db.collection("hospitalMembers").get()).docs) {
  if (typeof member.get("displayName") === "string") continue;
  const profile = await db.collection("users").doc(member.get("userId")).get();
  await member.ref.update({
    displayName: String(profile.get("fullName") ?? ""),
    email: String(profile.get("email") ?? ""),
  });
  count("hospitalMembers.displayName");
}

for (const event of (await db.collectionGroup("events").get()).docs) {
  if (typeof event.get("hospitalId") === "string") continue;
  const entry = await event.ref.parent.parent.get();
  await event.ref.update({
    hospitalId: entry.get("hospitalId"),
    queueId: entry.get("queueId"),
    queueNumber: entry.get("queueNumber"),
    patientName: String(entry.get("patientName") ?? ""),
  });
  count("events.context");
}

const summary = Object.entries(changes)
  .map(([key, n]) => `  ${key}: ${n}`)
  .join("\n");
console.log(`✔ ${PROJECT_ID}: backfill into "${DEFAULT_HOSPITAL}" done.`);
console.log(summary || "  Nothing to change.");
process.exit(0);
