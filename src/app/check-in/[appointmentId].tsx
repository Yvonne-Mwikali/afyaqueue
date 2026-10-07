import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, Typography } from "heroui-native";
import { type JSX, useState } from "react";
import { Alert, View } from "react-native";

import { CheckInState } from "@/components/feedback/check-in-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { BookingSummaryCard } from "@/components/shared/booking-summary";
import { type IconName, IconTile } from "@/components/ui/icon-tile";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { iconSize, textRole, useBrandColor } from "@/design-system";
import { canCheckIn, keepsScheduledPriority } from "@/features/appointments/appointment";
import { usePatientAppointments } from "@/features/appointments/use-patient-appointments";
import { useSession } from "@/features/auth/session";
import type { QueueEntry } from "@/features/queues/queue-entry";
import { checkIn } from "@/features/queues/use-queue-entries";
import { useServiceCatalogFor } from "@/features/services/use-service-catalog";
import { useDoctorsFor } from "@/features/doctors/use-doctors";
import { useHospitalContext } from "@/features/hospitals/hospital-context";
import { errorMessage } from "@/lib/app-error";
import { formatRelativeDay, formatShortDate, formatTime } from "@/utils/date-format";

type Phase = { kind: "review" } | { kind: "checking-in" } | { kind: "done"; entry: QueueEntry };

export default function CheckInRoute(): JSX.Element {
  const router = useRouter();
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const { user } = useSession();
  const { status, appointments } = usePatientAppointments("all");
  const [phase, setPhase] = useState<Phase>({ kind: "review" });
  const appointment = appointments.find((item) => item.id === appointmentId);
  // Always the appointment's own hospital, whatever hospital is active now.
  const appointmentHospital = appointment?.hospitalId ?? null;
  const catalog = useServiceCatalogFor(appointmentHospital);
  const doctors = useDoctorsFor(appointmentHospital);
  const { hospitals } = useHospitalContext();
  const hospitalName = hospitals.find((h) => h.id === appointmentHospital)?.name ?? "Your hospital";
  const service = catalog.services.find((item) => item.id === appointment?.serviceId);
  const doctor = doctors.find((item) => item.id === appointment?.doctorId);
  const back = (): void => router.back();
  const header = <ScreenHeader title="Check In" onBack={back} />;

  if (phase.kind === "done") {
    const { entry } = phase;
    return (
      <Screen
        header={header}
        footer={
          <PrimaryButton
            label="View Live Queue"
            onPress={() => {
              router.dismissAll();
              router.navigate("/queue");
            }}
          />
        }
      >
        <View className="pt-4">
          <CheckInState
            status="success"
            queueNumber={entry.queueNumber}
            queueStatus={`${entry.peopleAhead} ahead · ~${entry.estimatedWaitMinutes} min`}
          />
        </View>
      </Screen>
    );
  }

  if (status === "loading" || (!service && catalog.status === "loading")) {
    return (
      <Screen header={header}>
        <LoadingState title="Loading appointment" />
      </Screen>
    );
  }

  if (!appointment || !service || !canCheckIn(appointment)) {
    return (
      <Screen header={header}>
        <Typography.Paragraph color="muted">
          This appointment can&apos;t be checked in right now.
        </Typography.Paragraph>
      </Screen>
    );
  }

  const end = new Date(
    appointment.scheduledAt.getTime() +
      (appointment.durationMinutes ?? service.durationMinutes) * 60_000
  );
  const onTime = keepsScheduledPriority(appointment);
  const startCheckIn = (): void => {
    setPhase({ kind: "checking-in" });
    checkIn(appointment.id, user?.id ?? null).then(
      (entry) => setPhase({ kind: "done", entry }),
      (error: unknown) => {
        setPhase({ kind: "review" });
        Alert.alert("Couldn't check in", errorMessage(error));
      }
    );
  };

  return (
    <View className="flex-1">
      <Screen
        header={header}
        footer={
          <View className="gap-1">
            <PrimaryButton
              label="Check In Now"
              icon="map-marker-check-outline"
              onPress={startCheckIn}
            />
            <Button
              variant="ghost"
              onPress={() =>
                router.push({
                  pathname: "/book",
                  params: { serviceId: service.id, doctorId: doctor?.id ?? "any" },
                })
              }
            >
              <Button.Label className="text-brand-text">Reschedule Appointment</Button.Label>
            </Button>
          </View>
        }
      >
        {/* 1–2. What and where. */}
        <View className="gap-3 rounded-3xl bg-linear-to-r from-hero-from to-hero-to p-4">
          <View className="flex-row items-center gap-3">
            <IconTile
              icon={service.icon}
              size="sm"
              {...(service.tint ? { tint: service.tint } : {})}
            />
            <View className="flex-1">
              <Typography type={textRole.sectionTitle.type} weight={textRole.sectionTitle.weight}>
                {service.name}
              </Typography>
              <Typography type={textRole.supporting.type} color="muted">
                {doctor ? `${doctor.name} · ${doctor.title}` : "Any available doctor"}
              </Typography>
            </View>
          </View>
          <BookingSummaryCard
            rows={[
              {
                icon: "calendar-clock-outline",
                text: `${formatRelativeDay(appointment.scheduledAt)}, ${formatShortDate(appointment.scheduledAt)} · ${formatTime(appointment.scheduledAt)} – ${formatTime(end)}`,
              },
              {
                icon: "map-marker-outline",
                text: doctor
                  ? `${hospitalName} · ${doctor.facility}`
                  : `${hospitalName} · the desk will confirm your room`,
              },
            ]}
          />
        </View>

        {/* 3. What happens after. */}
        <InfoRow
          icon="account-group-outline"
          title="Checking in activates your place in the queue."
          text="You'll see your number and live updates right away."
        />
        <InfoRow
          icon="clock-check-outline"
          title={onTime ? "You're on time" : "Your appointment time has passed"}
          text={
            onTime
              ? "Check in before your appointment time to keep your place."
              : "You'll take the next available place in the queue."
          }
        />
      </Screen>
      {phase.kind === "checking-in" ? (
        <View className="absolute inset-0">
          <View className="flex-1 justify-center bg-background">
            <CheckInState status="processing" />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function InfoRow({
  icon,
  title,
  text,
}: {
  icon: IconName;
  title: string;
  text: string;
}): JSX.Element {
  const vivid = useBrandColor("brand-vivid");

  return (
    <View className="flex-row gap-3 px-1" accessible accessibilityLabel={`${title} ${text}`}>
      <View className="size-10 items-center justify-center rounded-full bg-brand-subtle">
        <MaterialCommunityIcons name={icon} size={iconSize.md} color={vivid} />
      </View>
      <View className="flex-1">
        <Typography type={textRole.bodyStrong.type} weight={textRole.bodyStrong.weight}>
          {title}
        </Typography>
        <Typography.Paragraph type={textRole.supporting.type} color="muted">
          {text}
        </Typography.Paragraph>
      </View>
    </View>
  );
}
