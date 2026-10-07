/**
 * Field validators for the auth forms. Each returns a short, patient-facing
 * message, or undefined when the value is acceptable.
 */
export const PASSWORD_MIN_LENGTH = 8;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function phoneDigits(value: string): string {
  return value.replace(/[\s()-]/g, "").replace(/^\+/, "");
}

function isPhone(value: string): boolean {
  const digits = phoneDigits(value);
  return /^\d{9,15}$/.test(digits);
}

export function validateFullName(value: string): string | undefined {
  const name = value.trim();
  if (!name) return "Enter your full name.";
  if (name.split(/\s+/).length < 2) return "Enter your first and last name.";
  return undefined;
}

export function validateEmail(value: string): string | undefined {
  const email = value.trim();
  if (!email) return "Enter your email address.";
  if (!EMAIL_PATTERN.test(email)) return "Enter a valid email address.";
  return undefined;
}

export function validatePhone(value: string): string | undefined {
  if (!value.trim()) return "Enter your phone number.";
  if (!isPhone(value)) return "Enter a valid phone number.";
  return undefined;
}

/** Sign-in only checks presence; strength rules apply when creating a password. */
export function validatePasswordPresent(value: string): string | undefined {
  return value ? undefined : "Enter your password.";
}

export function validateNewPassword(value: string): string | undefined {
  if (!value) return "Create a password.";
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  return undefined;
}

export function validatePasswordMatch(password: string, confirm: string): string | undefined {
  if (!confirm) return "Confirm your password.";
  if (confirm !== password) return "Passwords do not match.";
  return undefined;
}
