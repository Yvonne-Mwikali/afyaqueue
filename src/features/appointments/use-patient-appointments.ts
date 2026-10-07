import { useEffect, useSyncExternalStore } from "react";

import { useSession } from "@/features/auth/session";
import { loadedDoctors } from "@/features/doctors/use-doctors";
import { useActiveHospitalId } from "@/features/hospitals/hospital-context";
import { appointmentRepository } from "@/lib/backend";

import type { Appointment } from "./appointment";
import { type BookingRequest, prepareBooking } from "./booking";

type AppointmentsState = {
  /** Whose appointments these are; null before the first subscription. */
  patientId: string | null;
  status: "loading" | "ready" | "error";
  appointments: readonly Appointment[];
};

const LOADING: AppointmentsState = { patientId: null, status: "loading", appointments: [] };

let state: AppointmentsState = LOADING;
let unsubscribe: (() => void) | null = null;
const listeners = new Set<() => void>();

function setState(next: AppointmentsState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** One live subscription per signed-in patient, shared by every screen. */
function watch(patientId: string): void {
  if (state.patientId === patientId && unsubscribe) return;
  unsubscribe?.();
  setState({ patientId, status: "loading", appointments: [] });
  unsubscribe = appointmentRepository.watchForPatient(
    patientId,
    (appointments) => setState({ patientId, status: "ready", appointments }),
    () => {
      // The listener has stopped; `retry` starts a new one.
      unsubscribe = null;
      setState({ ...state, status: "error" });
    }
  );
}

function stop(): void {
  unsubscribe?.();
  unsubscribe = null;
  setState(LOADING);
}

/**
 * The signed-in patient's appointments, live. `status` is "loading" until
 * the first result arrives and "error" if it can't be read.
 */
export function usePatientAppointments(
  /** "active": the current patient hospital only; "all": every hospital. */
  scope: "active" | "all" = "active"
): AppointmentsState & { retry: () => void } {
  const { user } = useSession();
  const hospitalId = useActiveHospitalId();
  const patientId = user?.id ?? null;
  const current = useSyncExternalStore(subscribe, () => state);

  useEffect(() => {
    if (patientId) watch(patientId);
    else stop();
  }, [patientId]);

  const visible = current.patientId === patientId ? current : LOADING;
  // Hospital-specific screens see the active hospital; My Appointments sees all.
  const appointments =
    scope === "all"
      ? visible.appointments
      : visible.appointments.filter((item) => item.hospitalId === hospitalId);
  return {
    ...visible,
    appointments,
    retry: () => {
      if (!patientId) return;
      unsubscribe = null;
      watch(patientId);
    },
  };
}

/**
 * Validates and books an appointment for the signed-in patient; returns its
 * id. Throws AppError with a patient-facing message.
 */
export function bookAppointment(
  request: BookingRequest,
  patientId: string | null
): Promise<string> {
  const existing = state.patientId === patientId ? state.appointments : [];
  try {
    return appointmentRepository.book(
      prepareBooking(request, patientId, existing, loadedDoctors(request.hospitalId))
    );
  } catch (error) {
    return Promise.reject(error);
  }
}

/** Patient cancellation of a booked appointment. */
export function cancelAppointment(appointmentId: string): Promise<void> {
  return appointmentRepository.cancel(appointmentId);
}
