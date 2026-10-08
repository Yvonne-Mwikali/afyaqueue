import { useRouter } from "expo-router";
import { Typography } from "heroui-native";
import type { JSX } from "react";
import { View } from "react-native";

import { LoadingState } from "@/components/feedback/loading-state";
import { PatientHeader } from "@/components/shared/patient-header";
import { StaffQueueRow } from "@/components/shared/staff-queue-row";
import { Screen } from "@/components/ui/screen";
import { useDoctorIdentity } from "@/features/doctors/use-doctor-workspace";
import { useDoctors } from "@/features/doctors/use-doctors";
import { useServiceCatalog } from "@/features/services/use-service-catalog";
import { buildRoster } from "@/features/staff/roster";
import { rowText } from "@/features/staff/staff-view";
import { useDoctorEntries, useDoctorVisits } from "@/features/staff/use-staff-queues";
import { initialsFrom } from "@/features/users/user-profile";
import { greetingFor } from "@/utils/date-format";

/** The doctor's appointments today (theirs only), with live queue status. */
export default function DoctorTodayRoute(): JSX.Element {
  const router = useRouter();
  const { doctorId, doctor } = useDoctorIdentity();
  const visits = useDoctorVisits(doctorId);
  const entries = useDoctorEntries(doctorId);
  const { services } = useServiceCatalog();
  const { doctors } = useDoctors();
  const rows = buildRoster(visits.data, entries.data);
  const name = doctor?.name ?? "Doctor";

  return (
    <Screen>
      <PatientHeader
        title={`${greetingFor()}, ${name} 👋`}
        subtitle={doctor ? doctor.title : "Your appointments today."}
        initials={initialsFrom(name.replace(/^Dr\.?\s+/, ""))}
        onPressProfile={() => router.navigate("/doctor/profile")}
      />

      {!doctorId ? (
        <Typography.Paragraph color="muted">
          This account isn&apos;t linked to a doctor record yet. Please contact your hospital admin.
        </Typography.Paragraph>
      ) : visits.status === "loading" || entries.status === "loading" ? (
        <LoadingState title="Loading your day" />
      ) : visits.status === "error" || entries.status === "error" ? (
        <Typography.Paragraph color="muted">
          We couldn&apos;t load your appointments. Check your connection.
        </Typography.Paragraph>
      ) : rows.length === 0 ? (
        <Typography.Paragraph color="muted" align="center" className="py-8">
          No appointments are assigned to you today.
        </Typography.Paragraph>
      ) : (
        <View className="gap-2">
          {rows.map((row) => (
            <StaffQueueRow
              key={row.appointmentId}
              queueNumber={row.queueNumber}
              status={row.rosterStatus}
              {...rowText(row, services, doctors)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}
