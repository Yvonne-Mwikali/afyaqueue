import { createContext, type JSX, type ReactNode, use, useEffect, useState } from "react";

import type { AuthService, AuthUser, RegisterInput, SignInInput } from "./auth-service";

type Session = {
  /** "restoring" until the auth service reports whether a user is signed in. */
  status: "restoring" | "signed-in" | "signed-out";
  user: AuthUser | null;
  signIn: (input: SignInInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  sendEmailVerification: () => Promise<void>;
  /** Re-reads the user (e.g. after verifying their email). */
  refreshUser: () => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

/**
 * Mirrors the auth service's current user. Sign-in, registration and
 * sign-out only call the service; the user (and therefore the route
 * guards in src/app/_layout.tsx) updates through `onUserChanged`.
 */
export function SessionProvider({
  service,
  children,
}: {
  service: AuthService;
  children: ReactNode;
}): JSX.Element {
  const [state, setState] = useState<{ restored: boolean; user: AuthUser | null }>({
    restored: false,
    user: null,
  });

  useEffect(() => service.onUserChanged((user) => setState({ restored: true, user })), [service]);

  const session: Session = {
    status: !state.restored ? "restoring" : state.user ? "signed-in" : "signed-out",
    user: state.user,
    signIn: (input) => service.signIn(input),
    register: (input) => service.register(input),
    signOut: () => service.signOut(),
    sendPasswordReset: (email) => service.sendPasswordReset(email),
    sendEmailVerification: () => service.sendEmailVerification(),
    refreshUser: async () => {
      const user = await service.refreshUser();
      setState({ restored: true, user });
    },
  };

  return <SessionContext value={session}>{children}</SessionContext>;
}

export function useSession(): Session {
  const session = use(SessionContext);
  if (!session) throw new Error("useSession must be used inside SessionProvider.");
  return session;
}
