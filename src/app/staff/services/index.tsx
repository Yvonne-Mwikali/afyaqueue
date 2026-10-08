import { useRouter } from "expo-router";
import { Button, PressableFeedback, Typography } from "heroui-native";
import type { JSX } from "react";
import { View } from "react-native";

import { LoadingState } from "@/components/feedback/loading-state";
import { PatientHeader } from "@/components/shared/patient-header";
import { IconTile } from "@/components/ui/icon-tile";
import { Screen } from "@/components/ui/screen";
import { textRole } from "@/design-system";
import { doctorsForService } from "@/features/doctors/doctor";
import { useDoctors } from "@/features/doctors/use-doctors";
import { useServiceCatalog } from "@/features/services/use-service-catalog";
import { serviceStatus } from "@/features/staff/staff-view";
import { useQueueEntriesFor, useTodayQueues } from "@/features/staff/use-staff-queues";
import { usePatientIdentity } from "@/features/users/use-user-profile";

/** Today's state per service. Read-only: configuration is an admin task for later. */
export default function StaffServicesRoute(): JSX.Element {
  const router = useRouter();
  const { initials } = usePatientIdentity();
  const catalog = useServiceCatalog();
  const doctorsState = useDoctors();
  const queues = useTodayQueues();
  const entries = useQueueEntriesFor(queues.data.map((queue) => queue.id));

  const loading =
    catalog.status === "loading" ||
    queues.status === "loading" ||
    (queues.data.length > 0 && entries.status === "loading");
  const failed =
    catalog.status === "error" || queues.status === "error" || entries.status === "error";
  const retry = (): void => {
    catalog.retry();
    queues.retry();
    entries.retry();
    doctorsState.retry();
  };

  return (
    <Screen>
      <PatientHeader
        title="Services"
        subtitle={
          queues.data.length > 0 ? "Today's activity by service." : "No check-ins yet today."
        }
        titleVariant="screen"
        initials={initials}
        onPressProfile={() => router.navigate("/staff/settings")}
        // Notifications are not built yet.
      />

      {loading ? (
        <LoadingState title="Loading services" />
      ) : failed ? (
        <View className="items-center gap-3 py-8">
          <Typography.Paragraph color="muted" align="center">
            We couldn&apos;t load today&apos;s services. Check your connection.
          </Typography.Paragraph>
          <Button variant="tertiary" size="sm" hitSlop={4} onPress={retry}>
            <Button.Label>Try again</Button.Label>
          </Button>
        </View>
      ) : catalog.services.length === 0 ? (
        <Typography.Paragraph color="muted" align="center" className="py-8">
          No active services.
        </Typography.Paragraph>
      ) : (
        <View className="gap-2.5">
          {catalog.services.map((service) => {
            const status = serviceStatus(service.id, queues.data, entries.data);
            const doctorCount = doctorsForService(doctorsState.doctors, service.id).length;
            const active = status.waiting + status.called + status.inService + status.completed > 0;
            return (
              <PressableFeedback
                key={service.id}
                onPress={() =>
                  router.push({
                    pathname: "/staff/services/[serviceId]",
                    params: { serviceId: service.id },
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={`${service.name}. ${
                  active
                    ? `${status.waiting} waiting, ${status.called} called, ${status.inService} in service, ${status.completed} completed`
                    : "No activity today"
                }`}
                className="rounded-3xl"
              >
                <View className="gap-3 rounded-3xl border border-border bg-surface p-3.5">
                  <View className="flex-row items-center gap-3">
                    <IconTile
                      icon={service.icon}
                      size="sm"
                      {...(service.tint ? { tint: service.tint } : {})}
                    />
                    <View className="flex-1">
                      <Typography
                        type={textRole.itemTitle.type}
                        weight={textRole.itemTitle.weight}
                        numberOfLines={1}
                      >
                        {service.name}
                      </Typography>
                      <Typography type={textRole.supporting.type} color="muted">
                        {doctorCount === 1 ? "1 doctor" : `${doctorCount} doctors`}
                      </Typography>
                    </View>
                    <Typography
                      type={textRole.supporting.type}
                      weight="semibold"
                      className="text-brand-text"
                    >
                      {status.nowServing
                        ? `Now #${status.nowServing}`
                        : active
                          ? "Not started"
                          : "Quiet"}
                    </Typography>
                  </View>
                  {active ? (
                    <View className="flex-row">
                      <Count value={status.waiting} label="Waiting" />
                      <Count value={status.called} label="Called" />
                      <Count value={status.inService} label="In service" />
                      <Count value={status.completed} label="Done" />
                    </View>
                  ) : (
                    <Typography type={textRole.supporting.type} color="muted">
                      No activity today
                    </Typography>
                  )}
                </View>
              </PressableFeedback>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function Count({ value, label }: { value: number; label: string }): JSX.Element {
  return (
    <View className="flex-1 items-center">
      <Typography type={textRole.cardPrimary.type} weight="bold">
        {value}
      </Typography>
      <Typography type={textRole.caption.type} color="muted">
        {label}
      </Typography>
    </View>
  );
}
