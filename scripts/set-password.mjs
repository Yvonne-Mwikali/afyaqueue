// Sets a new password for an existing Firebase Auth user (no reset email).
//
//   node scripts/set-password.mjs user@example.com
//
// Prompts for the password without echoing it. Local admin tool only
// (Firebase Admin SDK; key configuration in scripts/lib/admin.mjs).
import { getAuth } from "firebase-admin/auth";

import { adminApp, askPassword, fail, PROJECT_ID } from "./lib/admin.mjs";

const email = process.argv[2]?.trim();
if (!email) fail("Usage: node scripts/set-password.mjs <email>");

const auth = getAuth(adminApp());

let user;
try {
  user = await auth.getUserByEmail(email);
} catch (error) {
  if (error?.code === "auth/user-not-found") fail(`No Firebase Auth user with email ${email}.`);
  fail(`Could not look up ${email}: ${error?.message ?? error}`);
}

const password = await askPassword();
await auth.updateUser(user.uid, { password });
console.log(`✔ Password updated in ${PROJECT_ID}`);
console.log(`  uid:   ${user.uid}`);
console.log(`  email: ${user.email}`);
process.exit(0);
