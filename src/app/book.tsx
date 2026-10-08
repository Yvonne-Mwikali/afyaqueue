import { useLocalSearchParams, useRouter } from "expo-router";
import { Typography } from "heroui-native";
import { type JSX, useState } from "react";
import { Alert, View } from "react-native";

import { LoadingState } from "@/components/feedback/loading-state";
import { BookingContext, BookingSummaryCard } from "@/components/shared/booking-summary";
import { DateStrip } from "@/components/shared/date-strip";
import { TimeSlotGrid } from "@/components/shared/time-slot-grid";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Stepper } from "@/components/ui/stepper";
import { textRole } from "@/design-system";
import {
  type DayAvailability,
  firstAvailableDay,
  type SlotStart,
  slotDate,
} from "@/features/appointments/availability";
import { useAvailability } from "@/features/appointments/use-availability";
import { bookAppointment } from "@/features/appointments/use-patient-appointments";
import { useSession } from "@/features/auth/session";
import { useActiveHospitalId, useHospitalContext } from "@/features/hospitals/hospital-context";
import { ANY_AVAILABLE_DOCTOR_ID } from "@/features/doctors/doctor";
import { useDoctors } from "@/features/doctors/use-doctors";
import { useServiceCatalog } from "@/features/services/use-service-catalog";
import { errorMessage } from "@/lib/app-error";
import { formatLongDate, formatMonthYear, formatTime } from "@/utils/date-format";

const STEPS = ["Choose Doctor", "Date & Time", "Confirm"];

export default function BookRoute(): JSX.Element {
  const router = useRouter();
  const { serviceId, doctorId = ANY_AVAILABLE_DOCTOR_ID } = useLocalSearchParams<{
    serviceId: string;
    doctorId?: string;
  }>();
  const { user } = useSession();
  const activeHospitalId = useActiveHospitalId();
  const { patientHospital } = useHospitalContext();
  // A booking belongs to the hospital it started at. If the patient switches
  // hospital mid-flow, stop rather than mix one hospital's service/doctor
  // into another's booking.
  const [hospitalId] = useState(activeHospitalId);
  const hospitalChanged = hospitalId !== activeHospitalId;
  const catalog = useServiceCatalog();
  const doctorsState = useDoctors();
  const service = catalog.services.find((item) => item.id === serviceId);
  const anyDoctor = doctorId === ANY_AVAILABLE_DOCTOR_ID;
  const doctor = anyDoctor ? undefined : doctorsState.doctors.find((item) => item.id === doctorId);
  // Held once computed, so the list doesn't shift while the patient chooses.
  const availability = useAvailability(
    service?.id,
    anyDoctor ? null : doctorId,
    service?.durationMinutes
  );
  const days = availability.status === "ready" ? availability.days : [];
  const [pickedDay, setDay] = useState<DayAvailability | undefined>();
  const day = pickedDay ?? firstAvailableDay(days);
  const [slot, setSlot] = useState<SlotStart | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const back = (): void => router.back();

  if (hospitalChanged) {
    return (
      <Screen header={<ScreenHeader title="Book Appointment" onBack={back} />}>
        <Typography.Paragraph color="muted">
          You switched hospital, so this booking was stopped. Start again from Services at your
          current hospital.
        </Typography.Paragraph>
        <PrimaryButton label="Start again" onPress={() => router.dismissAll()} />
      </Screen>
    );
  }

  const waitingForDoctor = !anyDoctor && !doctor && doctorsState.status === "loading";
  if (
    (!service && catalog.status === "loading") ||
    waitingForDoctor ||
    (service && availability.status === "loading")
  ) {
    return (
      <Screen header={<ScreenHeader title="Book Appointment" onBack={back} />}>
        <LoadingState title="Loading available times" />
      </Screen>
    );
  }

  const unavailable = !service
    ? "This service is not available."
    : !anyDoctor && !doctor
      ? doctorsState.status === "error"
        ? "We couldn't load this doctor. Check your connection and try again."
        : "This doctor isn't available. Go back to choose another doctor."
      : availability.status === "error"
        ? "We couldn't load available times. Please try again."
        : !day
          ? "No availability in the next two weeks."
          : null;

  if (!service || !day || unavailable) {
    return (
      <Screen header={<ScreenHeader title="Book Appointment" onBack={back} />}>
        <Typography.Paragraph color="muted">{unavailable}</Typography.Paragraph>
      </Screen>
    );
  }

  const doctorLabel = doctor ? `${doctor.name} · ${doctor.title}` : "Any available doctor";
  const start = slot === null ? null : slotDate(day.date, slot);
  const end = start ? new Date(start.getTime() + service.durationMinutes * 60_000) : null;

  const selectDay = (next: DayAvailability): void => {
    setDay(next);
    // A time belongs to its day; choosing a new day clears it.
    setSlot(null);
  };

  return (
    <View className="flex-1">
      <Screen
        header={<ScreenHeader title="Book Appointment" onBack={back} />}
        footer={
          <PrimaryButton
            label="Confirm Booking"
            icon="calendar-check-outline"
            isDisabled={start === null}
            accessibilityHint={start ? undefined : "Choose a time first"}
            onPress={() => {
              if (!start || submitting) return;
              setSubmitting(true);
              bookAppointment(
                {
                  hospitalId,
                  service,
                  doctorId: doctor?.id ?? null,
                  scheduledAt: start,
                  hospitalName: patientHospital?.name ?? "",
                },
                user?.id ?? null
              ).then(
                (appointmentId) =>
                  router.replace({
                    pathname: "/booking-confirmed",
                    params: {
                      appointmentId,
                      serviceId: service.id,
                      doctorId,
                      at: start.toISOString(),
                    },
                  }),
                (error: unknown) => {
                  setSubmitting(false);
                  Alert.alert("Couldn't book this appointment", errorMessage(error));
                }
              );
            }}
          />
        }
      >
        <View className="gap-2.5">
          <Stepper steps={STEPS} current={1} />
          <BookingContext service={service} doctorLabel={doctorLabel} onChange={back} />
        </View>

        <View className="gap-3">
          <View className="flex-row items-baseline justify-between">
            <Typography
              type={textRole.sectionTitle.type}
              weight={textRole.sectionTitle.weight}
              accessibilityRole="header"
            >
              Select a Date
            </Typography>
            <Typography type={textRole.supporting.type} color="muted">
              {formatMonthYear(day.date)}
            </Typography>
          </View>
          <DateStrip days={days} selected={day.date} onSelect={selectDay} />
        </View>

        <View className="gap-3">
          <Typography
            type={textRole.sectionTitle.type}
            weight={textRole.sectionTitle.weight}
            accessibilityRole="header"
          >
            Select a Time
          </Typography>
          <TimeSlotGrid day={day.date} slots={day.slots} selected={slot} onSelect={setSlot} />
        </View>

        <BookingSummaryCard
          rows={[
            {
              icon: "calendar-clock-outline",
              text: `${formatLongDate(day.date)} · ${
                start && end ? `${formatTime(start)} – ${formatTime(end)}` : "choose a time"
              }`,
            },
            {
              icon: "map-marker-outline",
              text: doctor ? `In-clinic visit · ${doctor.facility}` : "In-clinic visit",
            },
          ]}
        />
      </Screen>
      {submitting ? (
        <LoadingState
          fullScreen
          icon="calendar-check-outline"
          title="Confirming your appointment"
          message="We're reserving your selected time."
        />
      ) : null}
    </View>
  );
}
