import { useRouter } from "expo-router";
import { Button, SearchField, Typography } from "heroui-native";
import { type JSX, useState } from "react";
import { View } from "react-native";

import { LoadingState } from "@/components/feedback/loading-state";
import { PatientHeader } from "@/components/shared/patient-header";
import { StaffQueueRow } from "@/components/shared/staff-queue-row";
import { FilterChips } from "@/components/ui/filter-chips";
import { Screen } from "@/components/ui/screen";
import { useDoctors } from "@/features/doctors/use-doctors";
import { useServiceCatalog } from "@/features/services/use-service-catalog";
import {
  buildRoster,
  filterRoster,
  ROSTER_FILTERS,
  type RosterFilter,
} from "@/features/staff/roster";
import { rowText } from "@/features/staff/staff-view";
import {
  useQueueEntriesFor,
  useTodayQueues,
  useTodayVisits,
} from "@/features/staff/use-staff-queues";
import { usePatientIdentity } from "@/features/users/use-user-profile";

/** Today's patients: an operational roster, not a directory. */
export default function StaffPatientsRoute(): JSX.Element {
  const router = useRouter();
  const { initials } = usePatientIdentity();
  const visits = useTodayVisits();
  const queues = useTodayQueues();
  const entries = useQueueEntriesFor(queues.data.map((queue) => queue.id));
  const { services } = useServiceCatalog();
  const { doctors } = useDoctors();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RosterFilter>("all");

  const roster = buildRoster(visits.data, entries.data);
  const rows = filterRoster(roster, filter, query);
  const counts = new Map(
    ROSTER_FILTERS.map(({ id }) => [id, filterRoster(roster, id, "").length] as const)
  );
  const loading =
    visits.status === "loading" ||
    queues.status === "loading" ||
    (queues.data.length > 0 && entries.status === "loading");
  const failed =
    visits.status === "error" || queues.status === "error" || entries.status === "error";
  const retry = (): void => {
    visits.retry();
    queues.retry();
    entries.retry();
  };

  return (
    <Screen>
      <PatientHeader
        title="Patients"
        subtitle="Everyone with an appointment today."
        titleVariant="screen"
        initials={initials}
        onPressProfile={() => router.navigate("/staff/settings")}
        // Notifications are not built yet.
      />

      <View className="gap-4">
        <SearchField value={query} onChange={setQuery}>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input
              placeholder="Search today's patients by name"
              accessibilityLabel="Search today's patients"
              className="h-12 rounded-full border border-border bg-surface-secondary"
            />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <FilterChips
          options={ROSTER_FILTERS.map(({ id, label }) => ({
            id,
            label: `${label} · ${counts.get(id) ?? 0}`,
          }))}
          selected={filter}
          onSelect={setFilter}
        />
      </View>

      {loading ? (
        <LoadingState title="Loading today's patients" />
      ) : failed ? (
        <View className="items-center gap-3 py-8">
          <Typography.Paragraph color="muted" align="center">
            We couldn&apos;t load today&apos;s patients. Check your connection.
          </Typography.Paragraph>
          <Button variant="tertiary" size="sm" hitSlop={4} onPress={retry}>
            <Button.Label>Try again</Button.Label>
          </Button>
        </View>
      ) : roster.length === 0 ? (
        <Typography.Paragraph color="muted" align="center" className="py-8">
          No patients have appointments today.
        </Typography.Paragraph>
      ) : rows.length === 0 ? (
        <Typography.Paragraph color="muted" align="center" className="py-8">
          {query.trim() ? "No patients match your search." : "No patients with this status."}
        </Typography.Paragraph>
      ) : (
        <View className="gap-2">
          {rows.map((row) => (
            <StaffQueueRow
              key={row.appointmentId}
              queueNumber={row.queueNumber}
              status={row.rosterStatus}
              {...rowText(row, services, doctors)}
              onPress={() =>
                router.push({
                  pathname: "/staff/patients/[appointmentId]",
                  params: { appointmentId: row.appointmentId },
                })
              }
            />
          ))}
        </View>
      )}
    </Screen>
  );
}
