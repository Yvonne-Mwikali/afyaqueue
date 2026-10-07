import { useLocalSearchParams, useRouter } from "expo-router";
import { Typography } from "heroui-native";
import { type JSX, useState } from "react";
import { Alert, View } from "react-native";

import { LoadingState } from "@/components/feedback/loading-state";
import { PatientHeader } from "@/components/shared/patient-header";
import { useQueueEntryControls } from "@/components/shared/queue-entry-controls";
import { StaffQueueRow } from "@/components/shared/staff-queue-row";
import { FilterChips } from "@/components/ui/filter-chips";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Screen } from "@/components/ui/screen";
import { textRole } from "@/design-system";
import { useDoctors } from "@/features/doctors/use-doctors";
import { callOrder, inQueueOrder } from "@/features/queues/queue-order";
import { useServiceCatalog } from "@/features/services/use-service-catalog";
import {
  useQueueActions,
  useQueueEntriesFor,
  useTodayQueues,
} from "@/features/staff/use-staff-queues";
import { activeStaffEntries, callNote, queueCounts, rowText } from "@/features/staff/staff-view";
import { usePatientIdentity } from "@/features/users/use-user-profile";
import { errorMessage } from "@/lib/app-error";

export default function StaffQueueRoute(): JSX.Element {
  const router = useRouter();
  const { queueId: requested } = useLocalSearchParams<{ queueId?: string }>();
  const { initials } = usePatientIdentity();
  const queues = useTodayQueues();
  const { services } = useServiceCatalog();
  const { doctors } = useDoctors();
  const [picked, setPicked] = useState<string | undefined>();
  const queueActions = useQueueActions();
  const controls = useQueueEntryControls();
  // Busy: Call Next in progress (row actions track their own).
  const [busy, setBusy] = useState<string | null>(null);

  const selectedId =
    [picked, requested].find((id) => id && queues.data.some((queue) => queue.id === id)) ??
    queues.data[0]?.id;
  const queue = queues.data.find((item) => item.id === selectedId);
  const entries = useQueueEntriesFor(queue ? [queue.id] : []);
  const serviceName = (serviceId: string): string =>
    services.find((service) => service.id === serviceId)?.name ?? serviceId;

  const run = (key: string, action: () => Promise<unknown>): void => {
    if (busy) return;
    setBusy(key);
    action()
      .catch((error: unknown) => Alert.alert("Couldn't update the queue", errorMessage(error)))
      .finally(() => setBusy(null));
  };

  const header = (
    <PatientHeader
      title="Queue"
      titleVariant="screen"
      initials={initials}
      onPressProfile={() => router.navigate("/staff/settings")}
      onPressNotifications={() => undefined}
    />
  );

  if (queues.status === "loading") {
    return (
      <Screen>
        {header}
        <LoadingState title="Loading today's queues" />
      </Screen>
    );
  }

  if (!queue) {
    return (
      <Screen>
        {header}
        <Typography.Paragraph color="muted">
          {queues.status === "error"
            ? "We couldn't load today's queues. Check your connection."
            : "No queues yet today. A queue opens when the first patient checks in."}
        </Typography.Paragraph>
      </Screen>
    );
  }

  const active = inQueueOrder(activeStaffEntries(entries.data));
  const counts = queueCounts(entries.data);
  const waiting = callOrder(entries.data);

  const callNext = (): void =>
    run("call", async () => {
      const called = await queueActions.callNext(
        queue.id,
        waiting.map((entry) => entry.id)
      );
      if (!called) Alert.alert("Nobody is waiting", "Every patient in this queue has been called.");
    });

  return (
    <Screen
      footer={
        <PrimaryButton
          label={busy === "call" ? "Calling…" : "Call Next"}
          icon="bullhorn-outline"
          isDisabled={waiting.length === 0}
          accessibilityHint={waiting.length === 0 ? "Nobody is waiting" : undefined}
          onPress={callNext}
        />
      }
    >
      {header}

      {queues.data.length > 1 ? (
        <FilterChips
          options={queues.data.map((item) => ({ id: item.id, label: serviceName(item.serviceId) }))}
          selected={queue.id}
          onSelect={setPicked}
        />
      ) : null}

      <View
        className="flex-row items-center justify-between rounded-3xl bg-linear-to-r from-hero-from to-hero-to px-4 py-3"
        accessible
        accessibilityLabel={`${serviceName(queue.serviceId)}. Now serving ${queue.nowServing || "nobody yet"}. ${counts.waiting} waiting, ${counts.inService} in service.`}
      >
        <View>
          <Typography
            type={textRole.eyebrow.type}
            weight={textRole.eyebrow.weight}
            className={`text-brand-text ${textRole.eyebrow.className}`}
          >
            {serviceName(queue.serviceId)}
          </Typography>
          <Typography type={textRole.metric.type} weight={textRole.metric.weight}>
            {queue.nowServing > 0 ? `Now serving #${queue.nowServing}` : "Not started"}
          </Typography>
        </View>
        <View className="items-end">
          <Typography type={textRole.bodyStrong.type} weight="semibold">
            {counts.waiting} waiting
          </Typography>
          <Typography type={textRole.supporting.type} color="muted">
            {counts.inService} in service · {counts.completed} done
          </Typography>
        </View>
      </View>

      {entries.status === "loading" ? (
        <LoadingState title="Loading patients" />
      ) : entries.status === "error" ? (
        <Typography.Paragraph color="muted">
          We couldn&apos;t load this queue. Check your connection.
        </Typography.Paragraph>
      ) : active.length === 0 ? (
        <Typography.Paragraph type={textRole.supporting.type} color="muted">
          Nobody is waiting in this queue right now.
        </Typography.Paragraph>
      ) : (
        <View className="gap-2">
          {active.map((entry) => (
            <StaffQueueRow
              key={entry.id}
              queueNumber={entry.queueNumber}
              status={entry.status}
              {...rowText(entry, services, doctors)}
              {...(callNote(entry) ? { note: callNote(entry) } : {})}
              {...controls.rowProps(entry)}
            />
          ))}
        </View>
      )}
      {controls.sheet}
    </Screen>
  );
}
