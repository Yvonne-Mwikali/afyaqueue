import { useRouter } from "expo-router";
import { Button, Typography } from "heroui-native";
import { type JSX, useState } from "react";
import { View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { LoadingState } from "@/components/feedback/loading-state";
import { LiveQueueCard } from "@/components/shared/live-queue-card";
import { type QueueOption, QueueSwitcher } from "@/components/shared/queue-switcher";
import { PatientHeader } from "@/components/shared/patient-header";
import { IconTile } from "@/components/ui/icon-tile";
import { Screen } from "@/components/ui/screen";
import { duration, textRole } from "@/design-system";
import { usePatientAppointments } from "@/features/appointments/use-patient-appointments";
import { activeEntries, mostRelevantEntry } from "@/features/queues/queue-entry";
import { useQueueEntries } from "@/features/queues/use-queue-entries";
import { useHospitalContext } from "@/features/hospitals/hospital-context";
import { useServiceCatalog } from "@/features/services/use-service-catalog";
import { useDoctors } from "@/features/doctors/use-doctors";
import { usePatientIdentity } from "@/features/users/use-user-profile";
import { openDirections } from "@/lib/maps";

export default function PatientQueueRoute(): JSX.Element {
  const router = useRouter();
  const { initials } = usePatientIdentity();
  const { doctors } = useDoctors();
  const { status, appointments } = usePatientAppointments();
  const queueEntries = useQueueEntries();
  const catalog = useServiceCatalog();
  // The patient may pick which of today's queues to look at; defaults to the most relevant.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Queues are hospital-specific: name the hospital, and point to queues
  // elsewhere instead of mixing them in.
  const { patientHospital, hospitals, choosePatientHospital } = useHospitalContext();
  const elsewhere = activeEntries(useQueueEntries("all")).filter(
    (item) => item.hospitalId !== patientHospital?.id
  );
  const otherHospital = hospitals.find((h) => h.id === elsewhere[0]?.hospitalId);
  const header = (
    <View className="gap-3">
      <PatientHeader
        title="Live Queue"
        {...(patientHospital ? { subtitle: patientHospital.name } : {})}
        titleVariant="screen"
        initials={initials}
        onPressProfile={() => router.navigate("/profile")}
        // Notifications are not built yet.
      />
      {otherHospital ? (
        <View className="flex-row items-center gap-3 rounded-2xl bg-brand-subtle/50 px-4 py-3">
          <Typography type={textRole.supporting.type} className="flex-1">
            You&apos;re also in a queue at {otherHospital.name}.
          </Typography>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => void choosePatientHospital(otherHospital)}
          >
            Switch
          </Button>
        </View>
      ) : null}
    </View>
  );

  if (status === "loading") {
    return (
      <Screen>
        {header}
        <LoadingState title="Loading your queue" />
      </Screen>
    );
  }

  const entries = activeEntries(queueEntries);
  const entry = entries.find((item) => item.id === selectedId) ?? mostRelevantEntry(entries);

  if (!entry) {
    return (
      <Screen>
        {header}
        <View className="items-center gap-2 py-10">
          <Typography type={textRole.cardPrimary.type} weight={textRole.cardPrimary.weight}>
            You&apos;re not in a queue yet
          </Typography>
          <Typography.Paragraph type={textRole.supporting.type} color="muted" align="center">
            Check in when you arrive at the hospital to join the queue.
          </Typography.Paragraph>
          <Button variant="ghost" onPress={() => router.navigate("/appointments")}>
            <Button.Label className="text-brand-text">View appointments</Button.Label>
          </Button>
        </View>
      </Screen>
    );
  }

  const appointment = appointments.find((item) => item.id === entry.appointmentId);
  const service = catalog.services.find((item) => item.id === appointment?.serviceId);
  const doctor = doctors.find((item) => item.id === appointment?.doctorId);
  // All of today's queues in time order, named by their service.
  const options: QueueOption[] = entries
    .map((item) => {
      const itemAppointment = appointments.find((a) => a.id === item.appointmentId);
      return {
        entry: item,
        serviceName:
          catalog.services.find((svc) => svc.id === itemAppointment?.serviceId)?.name ?? "Your",
        at: itemAppointment?.scheduledAt.getTime() ?? 0,
      };
    })
    .sort((a, b) => a.at - b.at)
    .map(({ entry: item, serviceName }) => ({ entry: item, serviceName }));

  return (
    <Screen>
      {header}

      {/* Keyed by entry: switching queues fades the new one in. */}
      <Animated.View key={entry.id} entering={FadeIn.duration(duration.base)}>
        <LiveQueueCard entry={entry} serviceName={service?.name ?? "Your"} />
      </Animated.View>

      {options.length > 1 ? (
        <QueueSwitcher options={options} selectedId={entry.id} onSelect={setSelectedId} />
      ) : null}

      {/* Compact service context, secondary to the queue number. */}
      {service ? (
        <View className="flex-row items-center gap-3 px-1">
          <IconTile
            icon={service.icon}
            size="sm"
            {...(service.tint ? { tint: service.tint } : {})}
          />
          <View className="flex-1">
            <Typography type={textRole.bodyStrong.type} weight={textRole.bodyStrong.weight}>
              {service.name}
            </Typography>
            <Typography type={textRole.supporting.type} color="muted" numberOfLines={1}>
              {doctor ? `${doctor.name} · ${doctor.facility}` : "Any available doctor"}
            </Typography>
          </View>
        </View>
      ) : null}

      <View className="flex-row gap-2">
        {appointment ? (
          <Button
            variant="tertiary"
            size="sm"
            // 40dp visual height; hit area extends to 48dp.
            hitSlop={4}
            className="flex-1"
            onPress={() =>
              router.push({
                pathname: "/appointments/[appointmentId]",
                params: { appointmentId: appointment.id },
              })
            }
          >
            <Button.Label className="text-sm">View Appointment</Button.Label>
          </Button>
        ) : null}
        {doctor ? (
          <Button
            variant="tertiary"
            size="sm"
            hitSlop={4}
            className="flex-1"
            onPress={() => openDirections(doctor.facility)}
          >
            <Button.Label className="text-sm">Get Directions</Button.Label>
          </Button>
        ) : null}
      </View>
    </Screen>
  );
}
