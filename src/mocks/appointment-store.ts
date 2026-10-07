import {
  type Appointment,
  canCheckIn,
  canPatientModify,
  keepsScheduledPriority,
  visitIdFor,
} from "@/features/appointments/appointment";
import type { AppointmentRepository } from "@/features/appointments/appointment-repository";
import { type QueueEntry, queueKeyFor } from "@/features/queues/queue-entry";
import type { QueueSource } from "@/features/queues/queue-source";
import { AppError } from "@/lib/app-error";

import { appointmentsMock } from "./appointments";
import { queueEntriesMock } from "./queue";

/**
 * In-memory appointments and queue entries, used only while Firebase is not
 * configured (src/lib/backend.ts). Lives only for the app session.
 */
type State = {
  /** null until the first (mock) load completes. */
  appointments: Appointment[] | null;
  queueEntries: QueueEntry[];
};

let state: State = { appointments: null, queueEntries: [] };
const listeners = new Set<() => void>();

function setState(next: State): void {
  state = next;
  listeners.forEach((listener) => listener());
}

let loading: Promise<void> | null = null;

/** Loads the mock appointments once (short delay so loading states are visible). */
function loadAppointments(): Promise<void> {
  loading ??= new Promise<void>((resolve) => setTimeout(resolve, 500)).then(() => {
    if (state.appointments) return;
    const appointments = appointmentsMock();
    setState({ appointments, queueEntries: queueEntriesMock(appointments) });
  });
  return loading;
}

function updateAppointment(id: string, change: Partial<Appointment>): void {
  setState({
    ...state,
    appointments: (state.appointments ?? []).map((a) => (a.id === id ? { ...a, ...change } : a)),
  });
}

/** Patient cancellation; only allowed while booked (rule 14). */
function cancelAppointment(id: string): void {
  const appointment = state.appointments?.find((a) => a.id === id);
  if (appointment && canPatientModify(appointment)) updateAppointment(id, { status: "cancelled" });
}

/** Patients already ahead in each mock queue before this patient joins. */
const MOCK_QUEUE_BASE = 13;

/**
 * Check-in: marks the appointment checked in and creates its QueueEntry,
 * numbered within that service's queue for the day. Returns the entry, or
 * null if the appointment can't be checked in.
 */
function checkIn(id: string, now = new Date()): QueueEntry | null {
  const appointment = state.appointments?.find((a) => a.id === id);
  if (!appointment || !canCheckIn(appointment, now)) return null;
  const queueKey = queueKeyFor(appointment.serviceId, appointment.scheduledAt);
  const sameQueue = state.queueEntries.filter((entry) => entry.queueKey === queueKey).length;
  const scheduledPriority = keepsScheduledPriority(appointment, now);
  // Mock positions: on-time patients slot in near the front; late arrivals join the back.
  const peopleAhead = scheduledPriority ? 2 : 6;
  const queueNumber = MOCK_QUEUE_BASE + sameQueue + 1;
  const entry: QueueEntry = {
    id: `queue-${appointment.id}`,
    hospitalId: appointment.hospitalId,
    appointmentId: appointment.id,
    queueKey,
    queueNumber,
    status: "waiting",
    nowServing: queueNumber - peopleAhead - 1,
    scheduledPriority,
    peopleAhead,
    estimatedWaitMinutes: peopleAhead * 8,
  };
  setState({
    appointments: (state.appointments ?? []).map((a) =>
      a.id === id ? { ...a, status: "checked-in" } : a
    ),
    queueEntries: [...state.queueEntries, entry],
  });
  return entry;
}

/** Mock round trips so processing states are visible in demos. */
const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const mockAppointmentRepository: AppointmentRepository = {
  watchForPatient: (_patientId, onChange) => {
    const emit = (): void => {
      if (state.appointments) onChange(state.appointments);
    };
    listeners.add(emit);
    void loadAppointments().then(emit);
    return () => listeners.delete(emit);
  },
  book: async (appointment) => {
    await wait(1400);
    const id = `apt-${Date.now()}`;
    const created: Appointment = {
      id,
      hospitalId: appointment.hospitalId,
      visitId: visitIdFor(appointment.patientId, appointment.scheduledAt),
      serviceId: appointment.serviceId,
      ...(appointment.doctorId ? { doctorId: appointment.doctorId } : {}),
      scheduledAt: appointment.scheduledAt,
      durationMinutes: appointment.durationMinutes,
      visitType: appointment.visitType,
      status: "booked",
    };
    setState({ ...state, appointments: [...(state.appointments ?? []), created] });
    return id;
  },
  cancel: async (id) => {
    await wait(1000);
    cancelAppointment(id);
  },
};

export const mockQueueSource: QueueSource = {
  watchForPatient: (_patientId, onChange) => {
    const emit = (): void => onChange(state.queueEntries);
    listeners.add(emit);
    void loadAppointments().then(emit);
    return () => listeners.delete(emit);
  },
  checkIn: async (appointmentId) => {
    await wait(1400);
    const entry = checkIn(appointmentId);
    if (!entry) throw new AppError("This appointment can't be checked in right now.");
    return entry;
  },
};
