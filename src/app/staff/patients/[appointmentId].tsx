import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, Typography } from "heroui-native";
import type { JSX } from "react";

import { LoadingState } from "@/components/feedback/loading-state";
import { BookingSummaryCard } from "@/components/shared/booking-summary";
import { useQueueEntryControls } from "@/components/shared/queue-entry-controls";
import { StaffQueueRow } from "@/components/shared/staff-queue-row";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { textRole } from "@/design-system";
import { useDoctors } from "@/features/doctors/use-doctors";
import { useServiceCatalog } from "@/features/services/use-service-catalog";
import { buildRoster, type RosterStatus } from "@/features/staff/roster";
import { ACTION_LABELS, actionsFor } from "@/features/queues/queue-actions";
import { callNote, rowText } from "@/features/staff/staff-view";
import {
  useQueueEntriesFor,
  useTodayQueues,
  useTodayVisits,
} from "@/features/staff/use-staff-queues";
import { formatTime } from "@/utils/date-format";

const NOTES: Partial<Record<RosterStatus, string>> = {
  booked: "Not checked in yet. The patient joins the queue when they check in.",
  waiting: "Waiting in the queue. Call patients in order from the Queue tab.",
  completed: "This visit is complete.",
};

/** One patient's visit today: this appointment only, with the next operational step. */
export default function StaffPatientVisitRoute(): JSX.Element {
  const router = useRouter();
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const visits = useTodayVisits();
  const queues = useTodayQueues();
  const entries = useQueueEntriesFor(queues.data.map((queue) => queue.id));
  const { services } = useServiceCatalog();
  const { doctors } = useDoctors();
  const controls = useQueueEntryControls();
  const back = (): void => router.back();
  const header = <ScreenHeader title="Today's Visit" onBack={back} />;

  const row = buildRoster(visits.data, entries.data).find(
    (item) => item.appointmentId === appointmentId
  );

  if (visits.status === "loading" || queues.status === "loading") {
    return (
      <Screen header={header}>
        <LoadingState title="Loading visit" />
      </Screen>
    );
  }

  if (!row) {
    return (
      <Screen header={header}>
        <Typography.Paragraph color="muted">
          {visits.status === "error"
            ? "We couldn't load this visit. Check your connection."
            : "This visit isn't on today's list."}
        </Typography.Paragraph>
      </Screen>
    );
  }

  const text = rowText(row, services, doctors);
  const service = services.find((item) => item.id === row.serviceId);
  const doctor = doctors.find((item) => item.id === row.doctorId);
  const entry = row.entry;

  // Waiting patients are called in order from the Queue tab, not from here.
  const step = entry && entry.status !== "waiting" ? actionsFor(entry, new Date()).primary : null;
  const primary = step
    ? {
        label: controls.busyId === entry?.id ? "Saving…" : ACTION_LABELS[step],
        onPress: () => entry && controls.run(entry, step),
      }
    : entry?.status === "waiting"
      ? {
          label: "Open Queue",
          onPress: () =>
            router.navigate({ pathname: "/staff/queue", params: { queueId: entry.queueId } }),
        }
      : null;

  return (
    <Screen header={header} footer={primary ? <PrimaryButton {...primary} /> : undefined}>
      <StaffQueueRow
        queueNumber={row.queueNumber}
        status={row.rosterStatus}
        {...text}
        {...(entry && callNote(entry) ? { note: callNote(entry) } : {})}
        {...(entry && controls.rowProps(entry).onMore
          ? { onMore: controls.rowProps(entry).onMore }
          : {})}
      />

      <BookingSummaryCard
        rows={[
          {
            icon: "calendar-clock-outline",
            text: row.scheduledAt ? `Today · ${formatTime(row.scheduledAt)}` : "Today",
          },
          { icon: "stethoscope", text: service?.name ?? "Service" },
          {
            icon: "account-outline",
            text: doctor ? `${doctor.name} · ${doctor.title}` : "Any available doctor",
          },
        ]}
      />

      {NOTES[row.rosterStatus] ? (
        <Typography.Paragraph type={textRole.supporting.type} color="muted">
          {NOTES[row.rosterStatus]}
        </Typography.Paragraph>
      ) : null}

      {entry ? (
        <Button
          variant="ghost"
          onPress={() =>
            router.navigate({ pathname: "/staff/queue", params: { queueId: entry.queueId } })
          }
        >
          <Button.Label className="text-brand-text">
            View {service?.name ?? "service"} queue
          </Button.Label>
        </Button>
      ) : null}
      {controls.sheet}
    </Screen>
  );
}
