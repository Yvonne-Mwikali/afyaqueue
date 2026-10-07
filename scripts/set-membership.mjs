// DEVELOPER / RECOVERY TOOLING. Hospital admins invite people from the app
// (Hospital Admin → Team / Doctors). Use this only to bootstrap the first
// admin of a hospital or to repair access.
//
// Gives a user a role at one hospital (hospitalMembers/{hospitalId}_{uid}).
//
//   node scripts/set-membership.mjs nurse@example.com afyacare-hospital staff
//   node scripts/set-membership.mjs dr@example.com afyacare-hospital doctor samuel-okoye
//   node scripts/set-membership.mjs someone@example.com afyacare-hospital none   (deactivate)
//
// Roles: staff | doctor | admin | none. A doctor membership links the
// account to a doctor record in the same hospital (doctors/{id}.userId).
// A user may belong to several hospitals. Admin SDK; see scripts/lib/admin.mjs.
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

import { adminApp, fail, PROJECT_ID } from "./lib/admin.mjs";

const ROLES = ["staff", "doctor", "admin", "none"];
const USAGE =
  "Usage: node scripts/set-membership.mjs <email> <hospitalId> <staff|doctor|admin|none> [doctorId]";
const [email, hospitalId, role, doctorId] = process.argv.slice(2).map((arg) => arg.trim());
if (!email || !hospitalId || !role) fail(USAGE);
if (!ROLES.includes(role)) fail(`Unknown role "${role}". ${USAGE}`);
if (role === "doctor" && !doctorId) fail("A doctor membership needs the doctor record id.");

const app = adminApp();
const db = getFirestore(app);

const user = await getAuth(app)
  .getUserByEmail(email)
  .catch(() => fail(`No Firebase Auth user with email ${email}.`));
const hospital = await db.collection("hospitals").doc(hospitalId).get();
if (!hospital.exists) fail(`No hospital "${hospitalId}".`);

const ref = db.collection("hospitalMembers").doc(`${hospitalId}_${user.uid}`);
const existing = await ref.get();

if (role === "none") {
  if (!existing.exists) fail(`${email} has no membership at ${hospitalId}.`);
  await ref.update({ active: false, updatedAt: FieldValue.serverTimestamp() });
  const linked = existing.get("doctorId");
  if (linked) await db.collection("doctors").doc(linked).update({ userId: null });
  console.log(`✔ Deactivated ${email} at ${hospital.get("name")} (${PROJECT_ID}).`);
  process.exit(0);
}

if (role === "doctor") {
  const doctor = await db.collection("doctors").doc(doctorId).get();
  if (!doctor.exists) fail(`No doctor record "${doctorId}".`);
  if (doctor.get("hospitalId") !== hospitalId) fail(`${doctorId} is not at ${hospitalId}.`);
  const owner = doctor.get("userId");
  if (owner && owner !== user.uid) fail(`${doctorId} is already linked to another account.`);
  await doctor.ref.update({ userId: user.uid, updatedAt: FieldValue.serverTimestamp() });
}

const profile = await db.collection("users").doc(user.uid).get();
await ref.set(
  {
    hospitalId,
    userId: user.uid,
    // Shown on the admin Team screen (admins don't read profiles).
    displayName: String(profile.get("fullName") ?? user.displayName ?? ""),
    email: user.email ?? email,
    role,
    doctorId: role === "doctor" ? doctorId : null,
    active: true,
    ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    updatedAt: FieldValue.serverTimestamp(),
  },
  { merge: true }
);

console.log(`✔ ${email} is ${role} at ${hospital.get("name")} (${PROJECT_ID})`);
console.log(`  uid: ${user.uid}${role === "doctor" ? `  doctor: ${doctorId}` : ""}`);
process.exit(0);
