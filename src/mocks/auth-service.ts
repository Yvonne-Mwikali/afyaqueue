import type { AuthService, AuthUser } from "@/features/auth/auth-service";

/** Short pause so the busy state of the auth buttons is visible. */
const LATENCY_MS = 600;

const wait = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

type MockUser = AuthUser & { phone: string };

let current: MockUser | null = null;
const listeners = new Set<(user: AuthUser | null) => void>();

function setUser(user: MockUser | null): void {
  current = user;
  listeners.forEach((listener) => listener(user));
}

/**
 * Used only while Firebase is not configured (see src/lib/backend.ts).
 * Accepts any well-formed details; nothing is stored, so every app start
 * begins signed out.
 */
export const mockAuthService: AuthService = {
  onUserChanged: (listener) => {
    listeners.add(listener);
    listener(current);
    return () => listeners.delete(listener);
  },
  signIn: async ({ email }) => {
    await wait();
    // Mock mode has no stored profiles: the name is a neutral placeholder.
    setUser({
      id: "mock-patient",
      displayName: "Demo Patient",
      email,
      phone: "",
      emailVerified: true,
    });
  },
  register: async ({ fullName, email, phone }) => {
    await wait();
    setUser({ id: `mock-${Date.now()}`, displayName: fullName, email, phone, emailVerified: true });
  },
  sendEmailVerification: async () => {
    await wait();
  },
  refreshUser: () => Promise.resolve(current),
  sendPasswordReset: async () => {
    // Nothing is sent in mock mode; behaves like a successful request.
    await wait();
  },
  signOut: async () => {
    await wait();
    setUser(null);
  },
};

/** The signed-in mock user, for the mock profile repository. */
export function currentMockUser(): MockUser | null {
  return current;
}
