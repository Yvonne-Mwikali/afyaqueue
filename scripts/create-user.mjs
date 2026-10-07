// Creates a Firebase Auth email/password user plus its users/{uid} profile,
// the same shape the app writes at registration.
//
//   node scripts/create-user.mjs user@example.com --name "Amina Wanjiru" [--phone 0712345678] [--admin]
//
// Prompts for the password without echoing it. Local admin tool only
// (Firebase Admin SDK; key configuration in scripts/lib/admin.mjs).
import { parseArgs } from "node:util";

import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

import { adminApp, askPassword, fail, PROJECT_ID } from "./lib/admin.mjs";

const USAGE =
  'Usage: node scripts/create-user.mjs <email> --name "Full Name" [--phone 0712345678] [--admin]';

let parsed;
try {
  parsed = parseArgs({
    allowPositionals: true,
    options: {
      name: { type: "string" },
      phone: { type: "string", default: "" },
      admin: { type: "boolean", default: false },
    },
  });
} catch (error) {
  fail(`${error.message}\n${USAGE}`);
}
const email = parsed.positionals[0]?.trim();
const fullName = parsed.values.name?.trim();
if (!email || !fullName) fail(USAGE);
const role = parsed.values.admin ? "admin" : "patient";

const app = adminApp();
const auth = getAuth(app);

const existing = await auth.getUserByEmail(email).catch(() => null);
if (existing) {
  fail(
    `${email} already exists (uid ${existing.uid}). Use scripts/set-password.mjs to change its password.`
  );
}

const password = await askPassword();

let user;
try {
  user = await auth.createUser({ email, password, displayName: fullName });
} catch (error) {
  fail(`Could not create ${email}: ${error?.message ?? error}`);
}

await getFirestore(app).collection("users").doc(user.uid).set({
  fullName,
  phone: parsed.values.phone.trim(),
  email,
  role,
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
});

console.log(`✔ Created ${role} in ${PROJECT_ID}`);
console.log(`  uid:   ${user.uid}`);
console.log(`  email: ${user.email}`);
process.exit(0);
