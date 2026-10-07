// Sets an existing Firebase Auth user's role (users/{uid}.role).
//
//   node scripts/promote-user.mjs user@example.com staff
//   node scripts/promote-user.mjs user@example.com            (admin, as before)
//
// Roles: patient | staff | admin. Patients can never change their own role
// (Firestore rules); this script is the only way to set one.
//
// Local admin tool only: uses the Firebase Admin SDK with a service-account
// key, which bypasses security rules. Never import firebase-admin in src/.
// Key configuration: scripts/lib/admin.mjs.
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

import { adminApp, fail, PROJECT_ID } from "./lib/admin.mjs";

const ROLES = ["patient", "staff", "admin"];
const USAGE = "Usage: node scripts/promote-user.mjs <email> [patient|staff|admin]";

const email = process.argv[2]?.trim();
const role = (process.argv[3] ?? "admin").trim().toLowerCase();
if (!email) fail(USAGE);
if (!ROLES.includes(role)) fail(`Unknown role "${role}". ${USAGE}`);

const app = adminApp();

let user;
try {
  user = await getAuth(app).getUserByEmail(email);
} catch (error) {
  if (error?.code === "auth/user-not-found") {
    fail(`No Firebase Auth user with email ${email}. Register in the app first.`);
  }
  fail(`Could not look up ${email}: ${error?.message ?? error}`);
}

const db = getFirestore(app);
const ref = db.collection("users").doc(user.uid);

const previousRole = await db.runTransaction(async (transaction) => {
  const snapshot = await transaction.get(ref);
  if (snapshot.exists) {
    // Keep every existing profile field; change only the role.
    transaction.update(ref, { role, updatedAt: FieldValue.serverTimestamp() });
    return snapshot.get("role") ?? "(none)";
  }
  // No profile yet (e.g. its write failed at registration): create one.
  transaction.create(ref, {
    fullName: user.displayName ?? "",
    phone: user.phoneNumber ?? "",
    email: user.email ?? email,
    role,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return "(no profile; created)";
});

console.log(`✔ Role set to ${role} in ${PROJECT_ID}`);
console.log(`  uid:   ${user.uid}`);
console.log(`  email: ${user.email}`);
console.log(`  role:  ${previousRole} → ${role}`);
process.exit(0);
