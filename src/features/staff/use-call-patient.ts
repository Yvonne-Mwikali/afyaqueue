import { Alert, Linking } from "react-native";

import { useHospitalContext } from "@/features/hospitals/hospital-context";
import { staffQueueRepository } from "@/lib/backend";

import { type CallTarget, dialUrl } from "./call-patient";
import type { RosterRow } from "./roster";
import type { StaffQueueEntry } from "./staff-queue";

/**
 * Opens the dialer for a patient and records the attempt. Never touches
 * the queue. Explains a missing number or a phone that can't place calls.
 */
export function useCallPatient(): (target: CallTarget) => void {
  const { workspace } = useHospitalContext();
  return (target) => {
    const name = target.patientName || "This patient";
    const url = dialUrl(target.patientPhone);
    if (!workspace) return;
    if (!url) {
      Alert.alert(
        "No phone number",
        `${name} hasn't added a phone number. Try calling them in the queue instead.`
      );
      return;
    }
    void Linking.openURL(url).then(
      () =>
        // Only once the dialer opened. A failed record doesn't stop the call.
        void staffQueueRepository
          .logCallAttempt(
            {
              hospitalId: workspace.hospitalId,
              appointmentId: target.appointmentId,
              queueEntryId: target.queueEntryId,
              queueNumber: target.queueNumber,
              patientId: target.patientId,
              patientName: target.patientName,
            },
            workspace.role
          )
          .catch(() => undefined),
      () =>
        Alert.alert(
          "Couldn't start the call",
          `This phone can't place calls. The number is ${target.patientPhone}.`
        )
    );
  };
}

/** A queue entry as a call target. */
export function entryCallTarget(entry: StaffQueueEntry): CallTarget {
  return {
    appointmentId: entry.appointmentId,
    queueEntryId: entry.id,
    queueNumber: entry.queueNumber,
    patientId: entry.patientId,
    patientName: entry.patientName,
    patientPhone: entry.patientPhone,
  };
}

/** A visit (checked in or not) as a call target. */
export function visitCallTarget(row: RosterRow): CallTarget {
  return {
    appointmentId: row.appointmentId,
    queueEntryId: row.entry?.id ?? null,
    queueNumber: row.queueNumber,
    patientId: row.patientId,
    patientName: row.patientName,
    // Entries carry the number from check-in; the appointment from booking.
    patientPhone: row.entry?.patientPhone || row.patientPhone,
  };
}
