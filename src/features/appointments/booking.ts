import type { Doctor } from "@/features/doctors/doctor";
import type { ServiceMode, ServiceSummary } from "@/features/services/service-catalog";
import { AppError } from "@/lib/app-error";

import { type Appointment, isFinished } from "./appointment";

/** What the patient chose in the booking flow. */
export type BookingRequest = {
  /** The patient's active hospital; bookings are always made within one. */
  hospitalId: string | null;
  service: ServiceSummary | undefined;
  /** null = Any Available Doctor (rules 2–3). */
  doctorId: string | null;
  scheduledAt: Date | null;
  visitType?: ServiceMode;
};

/** A request that passed validation, ready for the repository. */
export type NewAppointment = {
  hospitalId: string;
  patientId: string;
  serviceId: string;
  doctorId: string | null;
  scheduledAt: Date;
  durationMinutes: number;
  visitType: ServiceMode;
};

function overlaps(aStart: Date, aMinutes: number, bStart: Date, bMinutes: number): boolean {
  const aEnd = aStart.getTime() + aMinutes * 60_000;
  const bEnd = bStart.getTime() + bMinutes * 60_000;
  return aStart.getTime() < bEnd && bStart.getTime() < aEnd;
}

/**
 * Checks a booking before it is sent. Throws AppError with a patient-facing
 * message. The patient-overlap check (rule 7) only sees appointments already
 * loaded on this device; it is a courtesy, not enforcement. Doctor
 * double-booking (rule 8) can't be checked here at all: patients can't read
 * other patients' appointments. Both need server-side enforcement
 * (docs/firebase-data-model.md).
 */
export function prepareBooking(
  request: BookingRequest,
  patientId: string | null,
  existing: readonly Appointment[],
  /** Active doctors with their services (only needed for a specific doctor). */
  doctors: readonly Doctor[],
  now = new Date()
): NewAppointment {
  const { service, scheduledAt } = request;
  if (!patientId) throw new AppError("Please sign in again to book.");
  const { hospitalId } = request;
  if (!hospitalId) throw new AppError("Choose your hospital before booking.");
  if (!service) throw new AppError("This service is no longer available.");
  if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
    throw new AppError("Choose a date and time first.");
  }
  if (scheduledAt.getTime() <= now.getTime()) {
    throw new AppError("That time has passed. Please choose another.");
  }
  if (request.doctorId !== null) {
    // `doctors` holds active doctors only; rules re-check all three server-side.
    const doctor = doctors.find((item) => item.id === request.doctorId);
    if (!doctor) {
      throw new AppError(
        "This doctor isn't available. Choose another doctor or Any available doctor."
      );
    }
    if (!doctor.serviceIds.includes(service.id)) {
      throw new AppError(`${doctor.name} doesn't provide ${service.name}.`);
    }
  }
  const visitType = request.visitType ?? "in-clinic";
  if (!service.modes.includes(visitType)) {
    throw new AppError("This service isn't available for that kind of visit.");
  }
  const clash = existing.find(
    (appointment) =>
      !isFinished(appointment) &&
      overlaps(
        appointment.scheduledAt,
        appointment.durationMinutes ?? service.durationMinutes,
        scheduledAt,
        service.durationMinutes
      )
  );
  if (clash) throw new AppError("You already have an appointment at this time.");

  return {
    hospitalId,
    patientId,
    serviceId: service.id,
    doctorId: request.doctorId,
    scheduledAt,
    durationMinutes: service.durationMinutes,
    visitType,
  };
}
