import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, Typography } from "heroui-native";
import { type JSX, useState } from "react";
import { Alert, View } from "react-native";

import { LoadingState } from "@/components/feedback/loading-state";
import { SuccessState } from "@/components/feedback/success-state";
import { StatusLabel } from "@/components/shared/appointment-card";
import { BookingSummaryCard } from "@/components/shared/booking-summary";
import { IconTile } from "@/components/ui/icon-tile";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { textRole } from "@/design-system";
import { canCheckIn, canPatientModify } from "@/features/appointments/appointment";
import {
  cancelAppointment,
  usePatientAppointments,
} from "@/features/appointments/use-patient-appointments";
import { useServiceCatalogFor } from "@/features/services/use-service-catalog";
import { useDoctorsFor } from "@/features/doctors/use-doctors";
import { useHospitalContext } from "@/features/hospitals/hospital-context";
import { errorMessage } from "@/lib/app-error";
import { formatLongDate, formatTime } from "@/utils/date-format";

// Appointment detail. Patients may reschedule or cancel only while booked.
export default function AppointmentDetailRoute(): JSX.Element {
  const router = useRouter();
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const { status, appointments, retry } = usePatientAppointments("all");
  const appointment = appointments.find((item) => item.id === appointmentId);
  const [cancelState, setCancelState] = useState<"idle" | "cancelling" | "cancelled">("idle");
  const back = (): void => router.back();
  // Always the appointment's own hospital, whatever hospital is active now.
  const appointmentHospital = appointment?.hospitalId ?? null;
  const catalog = useServiceCatalogFor(appointmentHospital);
  const doctors = useDoctorsFor(appointmentHospital);
  const { hospitals } = useHospitalContext();
  const hospitalName = hospitals.find((h) => h.id === appointmentHospital)?.name ?? "Your hospital";
  const service = catalog.services.find((item) => item.id === appointment?.serviceId);
  const doctor = doctors.find((item) => item.id === appointment?.doctorId);

  if (status === "loading" || (!service && catalog.status === "loading")) {
    return (
      <Screen header={<ScreenHeader title="Appointment" onBack={back} />}>
        <LoadingState title="Loading appointment" />
      </Screen>
    );
  }

  if (status === "error") {
    return (
      <Screen header={<ScreenHeader title="Appointment" onBack={back} />}>
        <View className="items-start gap-3">
          <Typography.Paragraph color="muted">
            We couldn&apos;t load this appointment. Check your connection.
          </Typography.Paragraph>
          <Button variant="tertiary" size="sm" hitSlop={4} onPress={retry}>
            <Button.Label>Try again</Button.Label>
          </Button>
        </View>
      </Screen>
    );
  }

  if (!appointment || !service) {
    return (
      <Screen header={<ScreenHeader title="Appointment" onBack={back} />}>
        <Typography.Paragraph color="muted">
          This appointment could not be found.
        </Typography.Paragraph>
      </Screen>
    );
  }

  if (cancelState === "cancelled") {
    return (
      <Screen header={<ScreenHeader title="Appointment" onBack={back} />}>
        <View className="pt-6">
          <SuccessState
            title="Appointment cancelled"
            message="Your time has been released. You can book again anytime."
          />
        </View>
      </Screen>
    );
  }

  const end = new Date(
    appointment.scheduledAt.getTime() +
      (appointment.durationMinutes ?? service.durationMinutes) * 60_000
  );
  const confirmCancel = (): void =>
    Alert.alert(
      "Cancel this appointment?",
      `${service.name}, ${formatLongDate(appointment.scheduledAt)}`,
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Cancel appointment",
          style: "destructive",
          onPress: () => {
            setCancelState("cancelling");
            cancelAppointment(appointment.id).then(
              () => setCancelState("cancelled"),
              (error: unknown) => {
                setCancelState("idle");
                Alert.alert("Couldn't cancel", errorMessage(error));
              }
            );
          },
        },
      ]
    );

  return (
    <View className="flex-1">
      <Screen header={<ScreenHeader title="Appointment" onBack={back} />}>
        <View className="flex-row items-center gap-3">
          <IconTile icon={service.icon} {...(service.tint ? { tint: service.tint } : {})} />
          <View className="flex-1 gap-0.5">
            <Typography type={textRole.sectionTitle.type} weight={textRole.sectionTitle.weight}>
              {service.name}
            </Typography>
            <Typography type={textRole.supporting.type} color="muted">
              {doctor ? `${doctor.name} · ${doctor.title}` : "Any available doctor"}
            </Typography>
            <StatusLabel appointment={appointment} />
          </View>
        </View>

        <BookingSummaryCard
          rows={[
            {
              icon: "calendar-clock-outline",
              text: `${formatLongDate(appointment.scheduledAt)} · ${formatTime(appointment.scheduledAt)} – ${formatTime(end)}`,
            },
            {
              icon: "map-marker-outline",
              text: `In-clinic visit · ${doctor?.facility || hospitalName}`,
            },
          ]}
        />

        {canCheckIn(appointment) ? (
          <PrimaryButton
            label="Check In"
            icon="map-marker-check-outline"
            onPress={() =>
              router.push({
                pathname: "/check-in/[appointmentId]",
                params: { appointmentId: appointment.id },
              })
            }
          />
        ) : null}

        {canPatientModify(appointment) ? (
          <View className="gap-1">
            <Button
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: "/book",
                  params: { serviceId: service.id, doctorId: doctor?.id ?? "any" },
                })
              }
            >
              Reschedule
            </Button>
            <Button variant="ghost" onPress={confirmCancel}>
              <Button.Label className="text-danger">Cancel appointment</Button.Label>
            </Button>
          </View>
        ) : (
          <Typography.Paragraph type={textRole.supporting.type} color="muted">
            {appointment.status === "delayed"
              ? "The clinic is running late. This won't count as you arriving late; please stay nearby."
              : "Changes are handled by hospital staff once you've checked in."}
          </Typography.Paragraph>
        )}
      </Screen>
      {cancelState === "cancelling" ? (
        <LoadingState
          fullScreen
          icon="calendar-remove-outline"
          title="Cancelling your appointment"
        />
      ) : null}
    </View>
  );
}
