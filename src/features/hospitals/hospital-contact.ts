/**
 * Public contact details a hospital admin maintains (Admin → Hospital) and
 * patients see on Contact. Never invented: an empty field is simply hidden.
 */
export type HospitalContact = {
  /** Main reception line; "Call hospital" dials this. */
  phone: string;
  supportPhone: string;
  /** Optional emergency line. */
  emergencyPhone: string;
  email: string;
};

export const EMPTY_CONTACT: HospitalContact = {
  phone: "",
  supportPhone: "",
  emergencyPhone: "",
  email: "",
};

// Same patterns as firestore.rules (isPhoneOrEmpty / isValidContact).
const PHONE = /^[+0-9 ()-]{0,20}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Field → message for invalid input; empty means valid. */
export function contactProblems(
  contact: HospitalContact
): Partial<Record<keyof HospitalContact, string>> {
  const problems: Partial<Record<keyof HospitalContact, string>> = {};
  const phoneProblem = (value: string): string | undefined => {
    if (value === "") return undefined;
    if (!PHONE.test(value)) return "Use digits, spaces, +, - or brackets (up to 20).";
    const digits = value.replace(/\D/g, "").length;
    return digits < 7 ? "That number looks too short." : undefined;
  };
  for (const key of ["phone", "supportPhone", "emergencyPhone"] as const) {
    const problem = phoneProblem(contact[key]);
    if (problem) problems[key] = problem;
  }
  if (contact.email !== "" && !EMAIL.test(contact.email)) {
    problems.email = "Enter an email such as reception@hospital.org.";
  }
  return problems;
}

/** Trims every field (what gets saved). */
export function cleanContact(contact: HospitalContact): HospitalContact {
  return {
    phone: contact.phone.trim(),
    supportPhone: contact.supportPhone.trim(),
    emergencyPhone: contact.emergencyPhone.trim(),
    email: contact.email.trim().toLowerCase(),
  };
}
