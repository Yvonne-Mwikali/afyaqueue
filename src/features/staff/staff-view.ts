import type { Doctor } from "@/features/doctors/doctor";
import type { ServiceSummary } from "@/features/services/service-catalog";
import { formatTime } from "@/utils/date-format";

import type { StaffQueue, StaffQueueEntry } from "./staff-queue";

/** Entries still in the queue flow today. */
export function activeStaffEntries(entries: readonly StaffQueueEntry[]): StaffQueueEntry[] {
  return entries.filter((entry) => entry.status !== "completed" && entry.status !== "no-show");
}

/** "Called 2 times · 3 min ago" style note for called/held rows. */
export function callNote(entry: StaffQueueEntry, now = new Date()): string | undefined {
  if (entry.status !== "called" && entry.status !== "held") return undefined;
  const parts: string[] = [];
  if (entry.status === "held") parts.push("On hold");
  if (entry.callCount > 1) parts.push(`Called ${entry.callCount} times`);
  if (entry.lastCalledAt) {
    const minutes = Math.floor((now.getTime() - entry.lastCalledAt.getTime()) / 60_000);
    parts.push(minutes < 1 ? "last called just now" : `last called ${minutes} min ago`);
  }
  return parts.join(" · ") || undefined;
}

/** Counts for the dashboard stat cards. */
export function queueCounts(entries: readonly StaffQueueEntry[]): {
  waiting: number;
  called: number;
  held: number;
  noShow: number;
  inQueue: number;
  inService: number;
  completed: number;
} {
  const count = (status: StaffQueueEntry["status"]): number =>
    entries.filter((entry) => entry.status === status).length;
  return {
    waiting: count("waiting"),
    called: count("called"),
    held: count("held"),
    noShow: count("no-show"),
    inQueue: count("waiting") + count("called"),
    inService: count("in-service"),
    completed: count("completed"),
  };
}

/** Row text: patient name (or a neutral fallback), context and time. */
export function rowText(
  entry: Pick<StaffQueueEntry, "serviceId" | "doctorId" | "patientName" | "scheduledAt">,
  services: readonly ServiceSummary[],
  doctors: readonly Doctor[]
): { name: string; context: string; time: string } {
  const service = services.find((item) => item.id === entry.serviceId)?.name ?? "Service";
  const doctor = doctors.find((item) => item.id === entry.doctorId)?.name;
  return {
    name: entry.patientName || "Patient",
    context: doctor ? `${service} · ${doctor}` : `${service} · Any available doctor`,
    time: entry.scheduledAt ? formatTime(entry.scheduledAt) : "",
  };
}

/** Per-service status counts for today. */
export type ServiceStatus = {
  waiting: number;
  called: number;
  inService: number;
  completed: number;
  nowServing: number | null;
  queueId: string | null;
};

export function serviceStatus(
  serviceId: string,
  queues: readonly StaffQueue[],
  entries: readonly StaffQueueEntry[]
): ServiceStatus {
  const queue = queues.find((item) => item.serviceId === serviceId);
  const own = queue ? entries.filter((entry) => entry.queueId === queue.id) : [];
  const count = (status: StaffQueueEntry["status"]): number =>
    own.filter((entry) => entry.status === status).length;
  return {
    waiting: count("waiting"),
    called: count("called"),
    inService: count("in-service"),
    completed: count("completed"),
    nowServing: queue && queue.nowServing > 0 ? queue.nowServing : null,
    queueId: queue?.id ?? null,
  };
}
