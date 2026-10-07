// Seeds Firestore `doctors`, `doctorServices` and weekly `doctorSchedules`
// from firebase/seed/doctors.json, doctor-services.json and
// doctor-schedules.json (each record carries its hospitalId).
//
//   node scripts/seed-doctors.mjs
//
// Uses the Firebase Admin SDK (scripts/lib/admin.mjs). Idempotent: fixed
// document IDs (doctor id; "{doctorId}_{serviceId}" for links), so running
// it again overwrites the same documents. createdAt is kept from the first
// run. Documents not in the seed are reported, never deleted.
import { readFile } from "node:fs/promises";

import { FieldValue, getFirestore } from "firebase-admin/firestore";

import { adminApp, fail, PROJECT_ID } from "./lib/admin.mjs";

const readSeed = async (name) =>
  JSON.parse(await readFile(new URL(`../firebase/seed/${name}`, import.meta.url), "utf8"));

const doctors = await readSeed("doctors.json");
const links = await readSeed("doctor-services.json");
const services = await readSeed("services.json");
const schedules = await readSeed("doctor-schedules.json");

// Validate before writing anything.
for (const link of links) {
  if (!doctors[link.doctorId]) fail(`Link references unknown doctor "${link.doctorId}".`);
  if (!services[link.serviceId]) fail(`Link references unknown service "${link.serviceId}".`);
}

for (const [id, window] of Object.entries(schedules)) {
  if (!doctors[window.doctorId])
    fail(`Schedule ${id} references unknown doctor "${window.doctorId}".`);
  if (window.hospitalId !== doctors[window.doctorId].hospitalId) {
    fail(`Schedule ${id} is in a different hospital from its doctor.`);
  }
}

const db = getFirestore(adminApp());

async function seed(collectionName, entries) {
  const collection = db.collection(collectionName);
  const refs = entries.map(([id]) => collection.doc(id));
  const existing = refs.length > 0 ? await db.getAll(...refs) : [];
  const batch = db.batch();
  entries.forEach(([, data], index) => {
    const isNew = !existing[index]?.exists;
    batch.set(
      refs[index],
      {
        ...data,
        ...(isNew ? { createdAt: FieldValue.serverTimestamp() } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
  await batch.commit();
  const all = await collection.listDocuments();
  const ids = entries.map(([id]) => id);
  const extra = all.map((doc) => doc.id).filter((id) => !ids.includes(id));
  console.log(`✔ ${collectionName}: ${entries.length} seeded (${all.length} documents total)`);
  if (extra.length > 0) console.log(`  Not in the seed (left unchanged): ${extra.join(", ")}`);
}

await seed("doctors", Object.entries(doctors));
await seed(
  "doctorServices",
  links.map((link) => [`${link.doctorId}_${link.serviceId}`, link])
);
await seed("doctorSchedules", Object.entries(schedules));
console.log(`Done in ${PROJECT_ID}.`);
process.exit(0);
