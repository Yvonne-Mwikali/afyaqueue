import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Button, Typography } from "heroui-native";
import { type JSX, useState } from "react";
import { View } from "react-native";

import { LoadingState } from "@/components/feedback/loading-state";
import { PatientHeader } from "@/components/shared/patient-header";
import { StaffQueueRow } from "@/components/shared/staff-queue-row";
import { FilterChips } from "@/components/ui/filter-chips";
import { Screen } from "@/components/ui/screen";
import { SectionHeader } from "@/components/ui/section-header";
import { iconSize, textRole, useBrandColor } from "@/design-system";
import { useDoctors } from "@/features/doctors/use-doctors";
import { inQueueOrder } from "@/features/queues/queue-order";
import { useServiceCatalog } from "@/features/services/use-service-catalog";
import { useQueueEntriesFor, useTodayQueues } from "@/features/staff/use-staff-queues";
import { activeStaffEntries, queueCounts, rowText } from "@/features/staff/staff-view";
import { usePatientIdentity } from "@/features/users/use-user-profile";
import { formatLongDate, greetingFor } from "@/utils/date-format";

const ALL = "all";
/** Rows shown in "Today's Queue" before "View all". */
const PREVIEW_ROWS = 6;

export default function StaffOverviewRoute(): JSX.Element {
  const router = useRouter();
  const vivid = useBrandColor("brand-vivid");
  const { firstName, initials } = usePatientIdentity();
  const queues = useTodayQueues();
  const entries = useQueueEntriesFor(queues.data.map((queue) => queue.id));
  const { services } = useServiceCatalog();
  const { doctors } = useDoctors();
  const [filter, setFilter] = useState<string>(ALL);

  const active = activeStaffEntries(entries.data);
  const shown = inQueueOrder(filter === ALL ? active : active.filter((e) => e.queueId === filter));
  const counts = queueCounts(
    filter === ALL ? entries.data : entries.data.filter((e) => e.queueId === filter)
  );
  const serviceName = (serviceId: string): string =>
    services.find((service) => service.id === serviceId)?.name ?? serviceId;
  const chips = [
    { id: ALL, label: `All Services · ${active.length}` },
    ...queues.data.map((queue) => ({
      id: queue.id,
      label: `${serviceName(queue.serviceId)} · ${active.filter((e) => e.queueId === queue.id).length}`,
    })),
  ];
  const openQueue = (queueId?: string): void =>
    router.navigate({ pathname: "/staff/queue", params: queueId ? { queueId } : {} });

  return (
    <Screen>
      <PatientHeader
        title={firstName ? `${greetingFor()}, ${firstName} 👋` : `${greetingFor()} 👋`}
        subtitle="Here's what's happening today."
        initials={initials}
        onPressProfile={() => router.navigate("/staff/settings")}
        // Notifications are not built yet.
      />

      <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
        <MaterialCommunityIcons name="calendar-month-outline" size={iconSize.lg} color={vivid} />
        <View>
          <Typography type={textRole.caption.type} color="muted">
            Today
          </Typography>
          <Typography type={textRole.bodyStrong.type} weight="semibold">
            {formatLongDate(new Date())}
          </Typography>
        </View>
      </View>

      {queues.status === "loading" || (queues.data.length > 0 && entries.status === "loading") ? (
        <LoadingState title="Loading today's queues" />
      ) : queues.status === "error" || entries.status === "error" ? (
        <Typography.Paragraph color="muted">
          We couldn&apos;t load today&apos;s queues. Check your connection.
        </Typography.Paragraph>
      ) : (
        <>
          {queues.data.length > 0 ? (
            <FilterChips options={chips} selected={filter} onSelect={setFilter} />
          ) : null}

          <View className="flex-row gap-3">
            <StatCard icon="account-group-outline" value={counts.inQueue} label="Total in Queue" />
            <StatCard icon="clock-outline" value={counts.inService} label="Currently in Service" />
          </View>

          <View className="gap-3">
            <SectionHeader
              title="Today's Queue"
              action={{
                label: "View all",
                onPress: () => openQueue(filter === ALL ? undefined : filter),
              }}
            />
            {shown.length === 0 ? (
              <View className="items-start gap-2">
                <Typography.Paragraph type={textRole.supporting.type} color="muted">
                  No patients are checked in yet.
                </Typography.Paragraph>
                <Button variant="ghost" size="sm" onPress={() => openQueue()}>
                  <Button.Label className="text-brand-text">Open queues</Button.Label>
                </Button>
              </View>
            ) : (
              <View className="gap-2">
                {shown.slice(0, PREVIEW_ROWS).map((entry) => (
                  <StaffQueueRow
                    key={entry.id}
                    queueNumber={entry.queueNumber}
                    status={entry.status}
                    {...rowText(entry, services, doctors)}
                  />
                ))}
              </View>
            )}
          </View>
        </>
      )}
    </Screen>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: "account-group-outline" | "clock-outline";
  value: number;
  label: string;
}): JSX.Element {
  const vivid = useBrandColor("brand-vivid");
  return (
    <View
      className="flex-1 flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-surface"
      accessible
      accessibilityLabel={`${value} ${label}`}
    >
      <MaterialCommunityIcons name={icon} size={28} color={vivid} />
      <View className="flex-1">
        <Typography type={textRole.metric.type} weight={textRole.metric.weight}>
          {value}
        </Typography>
        <Typography type={textRole.caption.type} color="muted">
          {label}
        </Typography>
      </View>
    </View>
  );
}
