import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PressableFeedback, Typography, useThemeColor } from "heroui-native";
import type { JSX } from "react";
import { View } from "react-native";

import { IconTile } from "@/components/ui/icon-tile";
import { StatusText } from "@/components/ui/status-text";
import { iconSize, textRole } from "@/design-system";
import { type Appointment, STATUS_PRESENTATION } from "@/features/appointments/appointment";
import type { Doctor } from "@/features/doctors/doctor";
import type { ServiceSummary } from "@/features/services/service-catalog";
import { formatShortDate, formatTime, formatTimeUntil } from "@/utils/date-format";

/** Appointment status in the shared treatment. Booked shows time until it instead. */
export function StatusLabel({ appointment }: { appointment: Appointment }): JSX.Element {
  const { label, tone } = STATUS_PRESENTATION[appointment.status];
  const text = appointment.status === "booked" ? formatTimeUntil(appointment.scheduledAt) : label;
  return <StatusText label={text} tone={tone} />;
}

type AppointmentCardProps = {
  appointment: Appointment;
  service: ServiceSummary;
  doctor?: Doctor | undefined;
  /** Show the date as well as the time (off inside Today's Visit). */
  showDate?: boolean;
  /** Which hospital (appointments from several hospitals can be listed together). */
  hospitalName?: string;
  onPress: () => void;
};

/** Compact appointment row: service icon, service, doctor, when, and one status label. */
export function AppointmentCard({
  appointment,
  service,
  doctor,
  showDate = true,
  hospitalName,
  onPress,
}: AppointmentCardProps): JSX.Element {
  const muted = useThemeColor("muted");
  const time = formatTime(appointment.scheduledAt);
  const when = showDate ? `${formatShortDate(appointment.scheduledAt)} · ${time}` : time;
  const doctorName = doctor?.name ?? "Any available doctor";
  const cancelled = appointment.status === "cancelled";

  return (
    <PressableFeedback
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${service.name} with ${doctorName}${hospitalName ? ` at ${hospitalName}` : ""}, ${when}. ${STATUS_PRESENTATION[appointment.status].label}.`}
      accessibilityHint="Opens appointment details"
      className="rounded-3xl"
    >
      <View
        className={`flex-row items-center gap-3 rounded-3xl border border-border bg-surface px-3 py-2.5 ${
          cancelled ? "opacity-70" : ""
        }`}
      >
        <IconTile icon={service.icon} size="sm" {...(service.tint ? { tint: service.tint } : {})} />
        <View className="flex-1 gap-0.5">
          <Typography type={textRole.cardPrimary.type} weight={textRole.cardPrimary.weight}>
            {service.name}
          </Typography>
          <Typography type={textRole.supporting.type} color="muted" numberOfLines={1}>
            {hospitalName ? `${doctorName} · ${hospitalName}` : doctorName}
          </Typography>
          <View className="flex-row flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <View className="flex-row items-center gap-1">
              <MaterialCommunityIcons name="clock-outline" size={14} color={muted} />
              <Typography type={textRole.caption.type} color="muted">
                {when}
              </Typography>
            </View>
            <StatusLabel appointment={appointment} />
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={iconSize.md} color={muted} />
      </View>
    </PressableFeedback>
  );
}
