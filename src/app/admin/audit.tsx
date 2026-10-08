import { useRouter } from "expo-router";
import { Button, Typography } from "heroui-native";
import { type JSX, useState } from "react";
import { View } from "react-native";

import { AdminRow, AdminSheet, EmptyState } from "@/components/admin/admin-ui";
import { LoadingState } from "@/components/feedback/loading-state";
import { FilterChips } from "@/components/ui/filter-chips";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { textRole } from "@/design-system";
import { useAdminMembers, useAdminServices, useAuditEvents } from "@/features/admin/use-admin";
import { localDateKey } from "@/features/appointments/appointment";
import { ACTION_LABELS, type QueueAction } from "@/features/queues/queue-actions";
import { formatShortDate, formatTime } from "@/utils/date-format";

const ALL = "all";
const STATUS: Record<string, string> = {
  waiting: "Waiting",
  called: "Called",
  held: "Held",
  "in-service": "In service",
  completed: "Completed",
  "no-show": "No show",
};

/** Who did what in the queues: patient display name and number only. */
export default function AdminAuditRoute(): JSX.Element {
  const router = useRouter();
  const [range, setRange] = useState<"today" | "week">("today");
  const [action, setAction] = useState<string>(ALL);
  const [actor, setActor] = useState<string>(ALL);
  const [service, setService] = useState<string>(ALL);
  const [filtering, setFiltering] = useState(false);
  const today = new Date();
  const since =
    range === "today"
      ? today
      : new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
  const events = useAuditEvents(localDateKey(since));
  const members = useAdminMembers();
  const services = useAdminServices();

  const actorName = (uid: string): string =>
    members.data.find((m) => m.userId === uid)?.displayName || "Team member";
  const serviceOf = (queueId: string): string => queueId.replace(/_\d{4}-\d{2}-\d{2}$/, "");
  const serviceName = (id: string): string => services.data.find((s) => s.id === id)?.name ?? id;
  const active = [action, actor, service].filter((value) => value !== ALL).length;

  const rows = events.data.filter(
    (e) =>
      (action === ALL || e.action === action) &&
      (actor === ALL || e.by === actor) &&
      (service === ALL || serviceOf(e.queueId) === service)
  );
  const clear = (): void => {
    setAction(ALL);
    setActor(ALL);
    setService(ALL);
  };

  return (
    <Screen header={<ScreenHeader title="Audit" onBack={() => router.back()} />}>
      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <SegmentedTabs
            segments={[
              { id: "today", label: "Today" },
              { id: "week", label: "7 days" },
            ]}
            selected={range}
            onSelect={setRange}
          />
        </View>
        <Button
          variant={active ? "primary" : "secondary"}
          size="sm"
          onPress={() => setFiltering(true)}
        >
          {active ? `Filters (${active})` : "Filters"}
        </Button>
      </View>

      {events.status === "loading" ? (
        <LoadingState title="Loading history" />
      ) : events.status === "error" ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Couldn't load history"
          description="Check your connection and try again."
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="history"
          title={
            active
              ? "Nothing matches these filters"
              : range === "today"
                ? "No queue activity today"
                : "No queue activity this week"
          }
          description={
            active
              ? "Try clearing a filter."
              : "Calls, holds, starts, completions, no-shows and phone calls to patients appear here as staff and doctors work the queues."
          }
          {...(active ? { action: { label: "Clear filters", onPress: clear } } : {})}
        />
      ) : (
        <View className="gap-2">
          {rows.map((e) => {
            const when = e.at
              ? range === "today"
                ? formatTime(e.at)
                : `${formatShortDate(e.at)} ${formatTime(e.at)}`
              : "";
            return e.action === "phone-call" ? (
              <AdminRow
                key={e.id}
                icon="phone-outline"
                title="Phone call"
                subtitle={`${e.queueNumber ? `#${e.queueNumber} · ` : ""}${e.patientName || "Patient"}`}
                // The dialer opened; whether the call connected isn't known.
                detail={`Dialer opened · ${actorName(e.by)} · ${when}`}
              />
            ) : (
              <AdminRow
                key={e.id}
                title={ACTION_LABELS[e.action] ?? e.action}
                subtitle={`#${e.queueNumber} · ${e.patientName || "Patient"} · ${serviceName(serviceOf(e.queueId))}`}
                detail={`${STATUS[e.from] ?? e.from} → ${STATUS[e.to] ?? e.to} · ${actorName(e.by)} · ${when}`}
              />
            );
          })}
        </View>
      )}

      <AdminSheet isOpen={filtering} onClose={() => setFiltering(false)} title="Filters">
        <View className="gap-2">
          <Typography type={textRole.supporting.type} weight="semibold" color="muted">
            Action
          </Typography>
          <FilterChips
            options={[
              { id: ALL, label: "All" },
              ...(Object.keys(ACTION_LABELS) as QueueAction[]).map((a) => ({
                id: a,
                label: ACTION_LABELS[a],
              })),
              { id: "phone-call", label: "Phone call" },
            ]}
            selected={action}
            onSelect={setAction}
          />
        </View>
        <View className="gap-2">
          <Typography type={textRole.supporting.type} weight="semibold" color="muted">
            Staff / doctor
          </Typography>
          <FilterChips
            options={[
              { id: ALL, label: "Everyone" },
              ...[...new Set(events.data.map((e) => e.by))].map((uid) => ({
                id: uid,
                label: actorName(uid),
              })),
            ]}
            selected={actor}
            onSelect={setActor}
          />
        </View>
        <View className="gap-2">
          <Typography type={textRole.supporting.type} weight="semibold" color="muted">
            Service
          </Typography>
          <FilterChips
            options={[
              { id: ALL, label: "All" },
              ...[
                ...new Set(events.data.flatMap((e) => (e.queueId ? [serviceOf(e.queueId)] : []))),
              ].map((id) => ({
                id,
                label: serviceName(id),
              })),
            ]}
            selected={service}
            onSelect={setService}
          />
        </View>
        <PrimaryButton label="Show results" onPress={() => setFiltering(false)} />
        {active ? (
          <Button variant="ghost" onPress={clear}>
            Clear filters
          </Button>
        ) : null}
      </AdminSheet>
    </Screen>
  );
}
