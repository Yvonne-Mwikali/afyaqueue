/**
 * Authentication contract. Screens and the session depend on this
 * interface only. Implementations: Firebase Auth
 * (./firebase-auth-service.ts) and an in-memory mock used until Firebase
 * credentials are configured (src/mocks/auth-service.ts).
 */
export type AuthUser = {
  id: string;
  displayName: string;
  email: string;
  /** Firebase sends the verification link; invitations require it. */
  emailVerified: boolean;
};

export type SignInInput = { email: string; password: string };

export type RegisterInput = {
  fullName: string;
  phone: string;
  email: string;
  password: string;
};

export interface AuthService {
  /**
   * Reports the current user right away (restored from the previous
   * session, or null) and again on every sign-in or sign-out.
   * Returns an unsubscribe function.
   */
  onUserChanged(listener: (user: AuthUser | null) => void): () => void;
  signIn(input: SignInInput): Promise<void>;
  register(input: RegisterInput): Promise<void>;
  signOut(): Promise<void>;
  /**
   * Emails password-reset instructions. Resolves the same way whether or
   * not an account exists for the email, so callers can't reveal it.
   */
  sendPasswordReset(email: string): Promise<void>;
  /** Emails a verification link to the signed-in user. */
  sendEmailVerification(): Promise<void>;
  /**
   * Re-reads the signed-in user (after they tapped the verification link)
   * and refreshes their token so security rules see the new state.
   */
  refreshUser(): Promise<AuthUser | null>;
}

/** A failure with a short message that can be shown to the patient as is. */
export class AuthError extends Error {
  override name = "AuthError";
}

/** Patient-facing message for any error thrown by an AuthService. */
export function authErrorMessage(error: unknown): string {
  return error instanceof AuthError ? error.message : "Something went wrong. Please try again.";
}
