/**
 * "Call patient": opens the phone's dialer with the patient's callback
 * number. A phone call, not a queue action: it never changes queue status
 * (use Call / Call Again for that). Each attempt is recorded for admins;
 * a record means the dialer opened, not that the call connected.
 */
export type CallTarget = {
  appointmentId: string;
  /** Null before check-in. */
  queueEntryId: string | null;
  queueNumber: number | null;
  patientId: string;
  patientName: string;
  /** "" when the patient gave no number. */
  patientPhone: string;
};

/** callLogs/{id}: one dialer opening by a staff member, admin or doctor. */
export type CallAttempt = Omit<CallTarget, "patientPhone"> & { hospitalId: string };

/** "tel:" URL for a stored phone number, or null when it can't be dialled. */
export function dialUrl(phone: string): string | null {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/[^\d]/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return `tel:${trimmed.startsWith("+") ? "+" : ""}${digits}`;
}
