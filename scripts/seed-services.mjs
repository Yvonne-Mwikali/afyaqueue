// Seeds Firestore `services` from firebase/seed/services.json.
//
//   node scripts/seed-services.mjs
//
// Uses the Firebase Admin SDK with the local service-account key (see
// scripts/lib/admin.mjs). Idempotent: each service is written under its
// fixed document ID, so running it again overwrites the same documents.
import { readFile } from "node:fs/promises";

import { FieldValue, getFirestore } from "firebase-admin/firestore";

import { adminApp, fail, PROJECT_ID } from "./lib/admin.mjs";

const services = JSON.parse(
  await readFile(new URL("../firebase/seed/services.json", import.meta.url), "utf8")
);
const ids = Object.keys(services);
if (ids.length === 0) fail("firebase/seed/services.json has no services.");

const db = getFirestore(adminApp());
const collection = db.collection("services");

const batch = db.batch();
for (const id of ids) {
  batch.set(collection.doc(id), { ...services[id], updatedAt: FieldValue.serverTimestamp() });
}
await batch.commit();
ids.forEach((id) => console.log(`  services/${id}`));

// Report (never delete) documents that aren't part of the seed.
const existing = await collection.listDocuments();
const extra = existing.map((doc) => doc.id).filter((id) => !ids.includes(id));
console.log(
  `✔ Seeded ${ids.length} services in ${PROJECT_ID} (${existing.length} documents total).`
);
if (extra.length > 0) console.log(`  Not in the seed (left unchanged): ${extra.join(", ")}`);
process.exit(0);
