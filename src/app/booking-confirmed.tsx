import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, Typography } from "heroui-native";
import type { JSX } from "react";
import { View } from "react-native";

import { SuccessState } from "@/components/feedback/success-state";
import { BookingSummaryCard } from "@/components/shared/booking-summary";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Screen } from "@/components/ui/screen";
import { textRole } from "@/design-system";
import { useServiceCatalog } from "@/features/services/use-service-catalog";
import { useDoctors } from "@/features/doctors/use-doctors";
import { formatShortDate, formatTime } from "@/utils/date-format";

// Shown after the appointment is saved. No queue entry exists yet: the
// queue is joined later, at Check-in on the day (rule 9).
export default function BookingConfirmedRoute(): JSX.Element {
  const router = useRouter();
  const { doctors } = useDoctors();
  const { serviceId, doctorId, at } = useLocalSearchParams<{
    serviceId: string;
    doctorId: string;
    at: string;
  }>();
  const catalog = useServiceCatalog();
  const service = catalog.services.find((item) => item.id === serviceId);
  const doctor = doctors.find((item) => item.id === doctorId);
  const when = at ? new Date(at) : null;
  const leaveFlow = (to: "/" | "/appointments"): void => {
    router.dismissAll();
    router.replace(to);
  };

  return (
    <Screen
      footer={
        <View className="gap-1">
          <PrimaryButton label="Back to Home" onPress={() => leaveFlow("/")} />
          <Button variant="ghost" onPress={() => leaveFlow("/appointments")}>
            <Button.Label className="text-brand-text">View Appointment</Button.Label>
          </Button>
        </View>
      }
    >
      <View className="pt-6">
        <SuccessState title="Appointment booked">
          <View className="w-full items-center gap-4">
            <View className="items-center">
              <Typography type={textRole.cardPrimary.type} weight={textRole.cardPrimary.weight}>
                {service?.name ?? "Your appointment"}
              </Typography>
              {when ? (
                <Typography.Paragraph color="muted" align="center">
                  {formatShortDate(when)} · {formatTime(when)}
                </Typography.Paragraph>
              ) : null}
              <Typography.Paragraph color="muted" align="center">
                {doctor?.name ?? "Any available doctor"}
              </Typography.Paragraph>
              <Typography.Paragraph
                type={textRole.supporting.type}
                color="muted"
                align="center"
                className="pt-2"
              >
                Check in when you arrive to join the queue.
              </Typography.Paragraph>
            </View>

            <View className="w-full">
              <BookingSummaryCard
                rows={[
                  {
                    icon: "map-marker-outline",
                    text: doctor ? `In-clinic visit · ${doctor.facility}` : "In-clinic visit",
                  },
                  ...(service
                    ? [
                        {
                          icon: "timer-outline" as const,
                          text: `${service.durationMinutes} min consultation`,
                        },
                      ]
                    : []),
                  {
                    icon: "account-clock-outline",
                    text: "Checking in on time keeps your scheduled priority.",
                  },
                ]}
              />
            </View>
          </View>
        </SuccessState>
      </View>
    </Screen>
  );
}
