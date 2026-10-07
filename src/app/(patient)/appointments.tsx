import { useRouter } from "expo-router";
import { Button, Typography } from "heroui-native";
import { type JSX, useState } from "react";
import { View } from "react-native";

import { LoadingState } from "@/components/feedback/loading-state";
import { AppointmentCard } from "@/components/shared/appointment-card";
import { PatientHeader } from "@/components/shared/patient-header";
import { FilterChips } from "@/components/ui/filter-chips";
import { Screen } from "@/components/ui/screen";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { textRole } from "@/design-system";
import { type Appointment, groupAppointments } from "@/features/appointments/appointment";
import { usePatientAppointments } from "@/features/appointments/use-patient-appointments";
import { useServicesAcross } from "@/features/services/use-service-catalog";
import { useDoctorsAcross } from "@/features/doctors/use-doctors";
import { useHospitalContext } from "@/features/hospitals/hospital-context";
import { usePatientIdentity } from "@/features/users/use-user-profile";
import { formatLongDate } from "@/utils/date-format";

type Tab = "upcoming" | "active" | "history";

export default function PatientAppointmentsRoute(): JSX.Element {
  const router = useRouter();
  const { initials } = usePatientIdentity();
  // Every hospital the patient has booked at, not just the active one.
  const { status, appointments: all, retry } = usePatientAppointments("all");
  const { hospitals } = useHospitalContext();
  const [hospitalFilter, setHospitalFilter] = useState("all");
  const hospitalIds = [...new Set(all.map((a) => a.hospitalId))];
  const serviceOf = useServicesAcross(hospitalIds);
  const doctorOf = useDoctorsAcross(hospitalIds);
  const hospitalName = (id: string): string =>
    hospitals.find((h) => h.id === id)?.name ?? "Hospital";
  const appointments =
    hospitalFilter === "all" ? all : all.filter((a) => a.hospitalId === hospitalFilter);
  const [tab, setTab] = useState<Tab>("upcoming");

  const ready = status === "ready";
  const groups = ready ? groupAppointments(appointments) : null;
  const open = (appointment: Appointment): void =>
    router.push({
      pathname: "/appointments/[appointmentId]",
      params: { appointmentId: appointment.id },
    });

  const renderCard = (appointment: Appointment, showDate = true): JSX.Element | null => {
    // Each appointment uses its own hospital's catalog.
    const service = serviceOf(appointment.hospitalId, appointment.serviceId);
    if (!service) return null;
    return (
      <AppointmentCard
        key={appointment.id}
        appointment={appointment}
        service={service}
        doctor={doctorOf(appointment.hospitalId, appointment.doctorId)}
        showDate={showDate}
        hospitalName={hospitalName(appointment.hospitalId)}
        onPress={() => open(appointment)}
      />
    );
  };

  return (
    <Screen>
      <PatientHeader
        title="My Appointments"
        titleVariant="screen"
        initials={initials}
        onPressProfile={() => router.navigate("/profile")}
        // Notifications are not built yet.
        onPressNotifications={() => undefined}
        hasUnreadNotifications
      />

      {groups ? (
        <>
          {hospitalIds.length > 1 ? (
            <FilterChips
              options={[
                { id: "all", label: "All hospitals" },
                ...hospitalIds.map((id) => ({ id, label: hospitalName(id) })),
              ]}
              selected={hospitalFilter}
              onSelect={setHospitalFilter}
            />
          ) : null}
          <SegmentedTabs
            segments={[
              {
                id: "upcoming",
                label: "Upcoming",
                count: groups.today.length + groups.upcoming.length,
              },
              { id: "active", label: "Active", count: groups.active.length },
              { id: "history", label: "History" },
            ]}
            selected={tab}
            onSelect={setTab}
          />

          {tab === "upcoming" ? (
            <View className="gap-4">
              {groups.today.length > 0 ? (
                <Section
                  title="Today's Visit"
                  aside={formatLongDate(groups.today[0]?.scheduledAt ?? new Date())}
                >
                  {groups.today.map((appointment) => renderCard(appointment, false))}
                </Section>
              ) : null}
              <Section title="Upcoming">
                {groups.upcoming.length > 0 ? (
                  groups.upcoming.map((appointment) => renderCard(appointment))
                ) : (
                  <Empty text="No other upcoming appointments." />
                )}
              </Section>
            </View>
          ) : null}

          {tab === "active" ? (
            <Section title="In progress today">
              {groups.active.length > 0 ? (
                groups.active.map((appointment) => renderCard(appointment, false))
              ) : (
                <Empty text="Nothing in progress. Check in when you arrive." />
              )}
            </Section>
          ) : null}

          {tab === "history" ? (
            <Section title="Past appointments">
              {groups.history.length > 0 ? (
                groups.history.map((appointment) => renderCard(appointment))
              ) : (
                <Empty text="No past appointments yet." />
              )}
            </Section>
          ) : null}
        </>
      ) : status === "error" ? (
        <View className="items-center gap-3 py-8">
          <Typography.Paragraph color="muted" align="center">
            We couldn&apos;t load your appointments. Check your connection.
          </Typography.Paragraph>
          <Button variant="tertiary" size="sm" hitSlop={4} onPress={retry}>
            <Button.Label>Try again</Button.Label>
          </Button>
        </View>
      ) : (
        <LoadingState title="Loading your appointments" />
      )}
    </Screen>
  );
}

function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <View className="gap-2">
      <View className="flex-row items-baseline justify-between gap-3">
        <Typography
          type={textRole.sectionTitle.type}
          weight={textRole.sectionTitle.weight}
          accessibilityRole="header"
        >
          {title}
        </Typography>
        {aside ? (
          <Typography type={textRole.supporting.type} color="muted" numberOfLines={1}>
            {aside}
          </Typography>
        ) : null}
      </View>
      <View className="gap-2">{children}</View>
    </View>
  );
}

function Empty({ text }: { text: string }): JSX.Element {
  return (
    <Typography.Paragraph type={textRole.supporting.type} color="muted">
      {text}
    </Typography.Paragraph>
  );
}
