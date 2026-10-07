// Shared Firebase Admin setup for local scripts (never imported by the app).
// Key path: FIREBASE_ADMIN_SERVICE_ACCOUNT (environment or .env), default
// ./firebase/service-account.json. See docs/firebase-setup.md.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { cert, initializeApp } from "firebase-admin/app";

export const PROJECT_ID = "afyaqueue-6c149";
const DEFAULT_KEY_PATH = "./firebase/service-account.json";

export function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

/** Admin app for afyaqueue-6c149. Exits if the key is missing or for another project. */
export function adminApp() {
  try {
    process.loadEnvFile();
  } catch {
    // No .env: rely on the environment or the default key path.
  }

  const keyPath = resolve(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT ?? DEFAULT_KEY_PATH);
  if (!existsSync(keyPath)) {
    fail(`Service-account key not found at ${keyPath}. See docs/firebase-setup.md.`);
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
  } catch {
    fail(`Could not read the service-account key at ${keyPath} (not valid JSON).`);
  }
  // Only the project id is ever printed; never the key contents.
  if (serviceAccount.project_id !== PROJECT_ID) {
    fail(`The key is for project "${serviceAccount.project_id}", expected "${PROJECT_ID}".`);
  }

  return initializeApp({ credential: cert(serviceAccount), projectId: PROJECT_ID });
}

/**
 * Asks for a password without echoing it (twice, to catch typos). Reads one
 * line from stdin when not run in a terminal. Never logs the value.
 */
export async function askPassword(minLength = 8) {
  const read = (prompt) =>
    new Promise((resolve) => {
      const { stdin, stdout } = process;
      if (!stdin.isTTY) {
        let data = "";
        stdin.setEncoding("utf8");
        stdin.on("data", (chunk) => (data += chunk));
        stdin.on("end", () => resolve(data.split(/\r?\n/)[0] ?? ""));
        return;
      }
      stdout.write(prompt);
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding("utf8");
      let value = "";
      const onData = (char) => {
        if (char === "\r" || char === "\n" || char === "\u0004") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          stdout.write("\n");
          resolve(value);
        } else if (char === "\u0003") {
          stdout.write("\n");
          process.exit(130);
        } else if (char === "\u007f" || char === "\b") {
          value = value.slice(0, -1);
        } else {
          value += char;
        }
      };
      stdin.on("data", onData);
    });

  const password = await read("New password: ");
  if (password.length < minLength) fail(`Password must be at least ${minLength} characters.`);
  if (process.stdin.isTTY) {
    const confirm = await read("Repeat password: ");
    if (confirm !== password) fail("Passwords do not match.");
  }
  return password;
}
