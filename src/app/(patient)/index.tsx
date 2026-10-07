import { useRouter } from "expo-router";
import { Button, Typography } from "heroui-native";
import type { JSX } from "react";
import { View } from "react-native";

import { LoadingState } from "@/components/feedback/loading-state";
import { AppointmentHero, AppointmentHeroEmpty } from "@/components/shared/appointment-hero";
import { HospitalContextButton } from "@/components/shared/hospital-context-button";
import { PatientHeader } from "@/components/shared/patient-header";
import { QueueSummaryCard } from "@/components/shared/queue-summary-card";
import { ServiceShortcutRow } from "@/components/shared/service-shortcut";
import { VisitLocationCard } from "@/components/shared/visit-location-card";
import { Screen } from "@/components/ui/screen";
import { SectionHeader } from "@/components/ui/section-header";
import { groupAppointments, nextAppointment } from "@/features/appointments/appointment";
import { usePatientAppointments } from "@/features/appointments/use-patient-appointments";
import { useDoctors } from "@/features/doctors/use-doctors";
import { activeEntries, mostRelevantEntry } from "@/features/queues/queue-entry";
import { useQueueEntries } from "@/features/queues/use-queue-entries";
import { useServiceCatalog } from "@/features/services/use-service-catalog";
import { usePatientIdentity } from "@/features/users/use-user-profile";
import { openDirections } from "@/lib/maps";
import { greetingFor } from "@/utils/date-format";

/** How many catalog services Home offers as shortcuts. */
const SHORTCUT_COUNT = 5;

export default function PatientHomeRoute(): JSX.Element {
  const router = useRouter();
  const { firstName, initials } = usePatientIdentity();
  const appointments = usePatientAppointments();
  const catalog = useServiceCatalog();
  const { doctors } = useDoctors();
  const queueEntries = useQueueEntries();
  const openAppointments = (): void => router.navigate("/appointments");
  const openServices = (): void => router.navigate("/services");
  // Notifications are not built yet; the bell and its unread dot are placeholder state.
  const openNotifications = (): void => undefined;

  const serviceOf = (serviceId: string | undefined) =>
    catalog.services.find((service) => service.id === serviceId);
  const doctorOf = (doctorId: string | undefined) =>
    doctors.find((doctor) => doctor.id === doctorId);

  const next = nextAppointment(appointments.appointments);
  const nextService = serviceOf(next?.serviceId);
  const nextDoctor = doctorOf(next?.doctorId);

  const entry = mostRelevantEntry(activeEntries(queueEntries));
  const entryAppointment = appointments.appointments.find((a) => a.id === entry?.appointmentId);

  const today = groupAppointments(appointments.appointments).today[0];
  const todayService = serviceOf(today?.serviceId);
  const todayFacility = doctorOf(today?.doctorId)?.facility ?? "Your hospital";

  const loadingNext =
    appointments.status === "loading" || (next !== undefined && catalog.status === "loading");

  return (
    <Screen>
      <PatientHeader
        title={firstName ? `${greetingFor()}, ${firstName} 👋` : `${greetingFor()} 👋`}
        initials={initials}
        onPressProfile={() => router.navigate("/profile")}
        onPressNotifications={openNotifications}
        hasUnreadNotifications
      />
      <HospitalContextButton />

      <View className="gap-2.5">
        {loadingNext ? (
          <LoadingState title="Loading your appointments" />
        ) : appointments.status === "error" ? (
          <View className="items-center gap-2 py-4">
            <Typography.Paragraph color="muted" align="center">
              We couldn&apos;t load your appointments.
            </Typography.Paragraph>
            <Button variant="tertiary" size="sm" hitSlop={4} onPress={appointments.retry}>
              <Button.Label>Try again</Button.Label>
            </Button>
          </View>
        ) : next && nextService ? (
          <AppointmentHero
            appointment={{
              serviceName: nextService.name,
              ...(nextDoctor
                ? { doctor: { name: nextDoctor.name, initials: nextDoctor.initials } }
                : {}),
              scheduledAt: next.scheduledAt,
              durationMinutes: next.durationMinutes ?? nextService.durationMinutes,
            }}
            onPress={openAppointments}
          />
        ) : (
          <AppointmentHeroEmpty onPress={openServices} />
        )}
        {entry ? (
          <QueueSummaryCard
            queue={{
              serviceName: serviceOf(entryAppointment?.serviceId)?.name ?? "Your",
              queueNumber: entry.queueNumber,
              peopleAhead: entry.peopleAhead,
              estimatedWaitMinutes: entry.estimatedWaitMinutes,
            }}
            onPress={() => router.navigate("/queue")}
          />
        ) : null}
      </View>

      {/* Open layout: tapping a service starts booking; View all opens Services. */}
      {catalog.services.length > 0 ? (
        <View className="gap-3">
          <SectionHeader
            title="Book a Service"
            action={{ label: "View all", onPress: openServices }}
          />
          <ServiceShortcutRow
            services={catalog.services.slice(0, SHORTCUT_COUNT)}
            onPress={(service) =>
              router.push({ pathname: "/services/[serviceId]", params: { serviceId: service.id } })
            }
          />
        </View>
      ) : null}

      {today && todayService ? (
        <View className="gap-3">
          <SectionHeader title="Today's Visit" />
          <VisitLocationCard
            location={{ facilityName: todayFacility, department: todayService.name }}
            onGetDirections={() => openDirections(todayFacility)}
          />
        </View>
      ) : null}
    </Screen>
  );
}
