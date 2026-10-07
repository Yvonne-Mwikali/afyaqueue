import { useLocalSearchParams, useRouter } from "expo-router";
import { Typography } from "heroui-native";
import type { JSX } from "react";
import { View } from "react-native";

import { LoadingState } from "@/components/feedback/loading-state";
import { StaffQueueRow } from "@/components/shared/staff-queue-row";
import { IconTile } from "@/components/ui/icon-tile";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { SectionHeader } from "@/components/ui/section-header";
import { textRole } from "@/design-system";
import { doctorsForService } from "@/features/doctors/doctor";
import { useDoctors } from "@/features/doctors/use-doctors";
import { callOrder, inQueueOrder } from "@/features/queues/queue-order";
import { useServiceCatalog } from "@/features/services/use-service-catalog";
import { rowText, serviceStatus } from "@/features/staff/staff-view";
import { useQueueEntriesFor, useTodayQueues } from "@/features/staff/use-staff-queues";

/** Rows of "Up next" shown before pointing to the Queue tab. */
const UP_NEXT = 3;

/** One service today: doctors, queue summary and who's next. Opens the Queue to act. */
export default function StaffServiceDetailRoute(): JSX.Element {
  const router = useRouter();
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>();
  const catalog = useServiceCatalog();
  const { doctors } = useDoctors();
  const queues = useTodayQueues();
  const queue = queues.data.find((item) => item.serviceId === serviceId);
  const entries = useQueueEntriesFor(queue ? [queue.id] : []);
  const service = catalog.services.find((item) => item.id === serviceId);
  const header = <ScreenHeader title={service?.name ?? "Service"} onBack={() => router.back()} />;

  if (catalog.status === "loading" || queues.status === "loading") {
    return (
      <Screen header={header}>
        <LoadingState title="Loading service" />
      </Screen>
    );
  }

  if (!service) {
    return (
      <Screen header={header}>
        <Typography.Paragraph color="muted">This service isn&apos;t active.</Typography.Paragraph>
      </Screen>
    );
  }

  const status = serviceStatus(service.id, queues.data, entries.data);
  const linked = doctorsForService(doctors, service.id);
  const serving = inQueueOrder(
    entries.data.filter((entry) => entry.status === "called" || entry.status === "in-service")
  );
  const upNext = callOrder(entries.data).slice(0, UP_NEXT);

  return (
    <Screen
      header={header}
      footer={
        <PrimaryButton
          label="Open Queue"
          icon="format-list-numbered"
          isDisabled={!status.queueId}
          accessibilityHint={status.queueId ? undefined : "No patients have checked in today"}
          onPress={() =>
            status.queueId &&
            router.navigate({ pathname: "/staff/queue", params: { queueId: status.queueId } })
          }
        />
      }
    >
      <View className="flex-row items-center gap-3 rounded-3xl bg-linear-to-r from-hero-from to-hero-to p-4">
        <IconTile icon={service.icon} {...(service.tint ? { tint: service.tint } : {})} />
        <View className="flex-1">
          <Typography type={textRole.metric.type} weight={textRole.metric.weight}>
            {status.nowServing ? `Now serving #${status.nowServing}` : "Not started"}
          </Typography>
          <Typography type={textRole.supporting.type} color="muted">
            {status.waiting} waiting · {status.called + status.inService} being seen ·{" "}
            {status.completed} done
          </Typography>
        </View>
      </View>

      {!queue ? (
        <Typography.Paragraph type={textRole.supporting.type} color="muted">
          No patients have checked in for {service.name} today.
        </Typography.Paragraph>
      ) : entries.status === "loading" ? (
        <LoadingState title="Loading queue" />
      ) : (
        <>
          <View className="gap-2">
            <SectionHeader title="Currently serving" />
            {serving.length > 0 ? (
              serving.map((entry) => (
                <StaffQueueRow
                  key={entry.id}
                  queueNumber={entry.queueNumber}
                  status={entry.status}
                  {...rowText(entry, catalog.services, doctors)}
                />
              ))
            ) : (
              <Typography type={textRole.supporting.type} color="muted">
                Nobody is being seen right now.
              </Typography>
            )}
          </View>
          <View className="gap-2">
            <SectionHeader title="Up next" />
            {upNext.length > 0 ? (
              upNext.map((entry) => (
                <StaffQueueRow
                  key={entry.id}
                  queueNumber={entry.queueNumber}
                  status={entry.status}
                  {...rowText(entry, catalog.services, doctors)}
                />
              ))
            ) : (
              <Typography type={textRole.supporting.type} color="muted">
                Nobody is waiting.
              </Typography>
            )}
          </View>
        </>
      )}

      <View className="gap-2">
        <SectionHeader title="Doctors" />
        {linked.length > 0 ? (
          linked.map((doctor) => (
            <Typography key={doctor.id} type={textRole.body.type}>
              {doctor.name}
              <Typography type={textRole.supporting.type} color="muted">
                {"  "}
                {doctor.title}
              </Typography>
            </Typography>
          ))
        ) : (
          <Typography type={textRole.supporting.type} color="muted">
            No doctors are linked to this service yet.
          </Typography>
        )}
      </View>
    </Screen>
  );
}
