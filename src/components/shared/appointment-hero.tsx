import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Chip, PressableFeedback, Typography } from "heroui-native";
import type { JSX } from "react";
import { View } from "react-native";

import type { IconName } from "@/components/ui/icon-tile";
import { iconSize, textRole, useBrandColor } from "@/design-system";
import { formatRelativeDay, formatShortDate, formatTime } from "@/utils/date-format";

export type AppointmentSummary = {
  serviceName: string;
  /** Absent when the patient booked Any Available Doctor. */
  doctor?: { name: string; initials: string };
  scheduledAt: Date;
  durationMinutes: number;
};

type AppointmentHeroProps = {
  appointment: AppointmentSummary;
  onPress: () => void;
};

/** The Home screen's lead block: the patient's next appointment. */
export function AppointmentHero({ appointment, onPress }: AppointmentHeroProps): JSX.Element {
  const vivid = useBrandColor("brand-vivid");
  const { serviceName, doctor, scheduledAt, durationMinutes } = appointment;
  const endsAt = new Date(scheduledAt.getTime() + durationMinutes * 60_000);
  const day = formatRelativeDay(scheduledAt);
  const date = formatShortDate(scheduledAt);
  const timeRange = `${formatTime(scheduledAt)} – ${formatTime(endsAt)}`;
  const doctorName = doctor?.name ?? "Any available doctor";
  const title = textRole.cardTitle;

  return (
    <PressableFeedback
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Next appointment, ${day}: ${serviceName} with ${doctorName}, ${date}, ${timeRange}`}
      accessibilityHint="Opens your appointments"
      className="rounded-3xl"
    >
      <View className="overflow-hidden rounded-3xl bg-linear-to-r from-hero-from to-hero-to px-4 pb-3.5 pt-3 shadow-surface">
        <PortraitSlot />

        <View className="flex-row items-center gap-2">
          <MaterialCommunityIcons name="calendar-month-outline" size={iconSize.md} color={vivid} />
          <Typography.Paragraph
            type={textRole.eyebrow.type}
            weight={textRole.eyebrow.weight}
            className={`flex-1 text-brand-text ${textRole.eyebrow.className}`}
          >
            Next Appointment
          </Typography.Paragraph>
          <Chip size="sm" variant="soft" color="accent" className="bg-brand-subtle px-3">
            <Chip.Label className="font-semibold text-brand-subtle-foreground">{day}</Chip.Label>
          </Chip>
        </View>

        <Typography.Heading
          type={title.type}
          weight={title.weight}
          className={`${title.className} mt-0.5`}
        >
          {serviceName}
        </Typography.Heading>

        {/* pr-30 keeps text clear of the 122dp portrait slot. */}
        <View className="mt-2 gap-1 pr-30">
          <DetailRow icon="account-outline" text={doctorName} />
          <DetailRow icon="calendar-clock-outline" text={`${date} · ${timeRange}`} muted />
        </View>
      </View>
    </PressableFeedback>
  );
}

/** Same lead block when nothing is booked: points to booking instead. */
export function AppointmentHeroEmpty({ onPress }: { onPress: () => void }): JSX.Element {
  const vivid = useBrandColor("brand-vivid");
  const title = textRole.cardTitle;

  return (
    <PressableFeedback
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="No upcoming appointments. Book a service."
      className="rounded-3xl"
    >
      <View className="overflow-hidden rounded-3xl bg-linear-to-r from-hero-from to-hero-to px-4 pb-3.5 pt-3 shadow-surface">
        <PortraitSlot />
        <View className="flex-row items-center gap-2">
          <MaterialCommunityIcons name="calendar-month-outline" size={iconSize.md} color={vivid} />
          <Typography.Paragraph
            type={textRole.eyebrow.type}
            weight={textRole.eyebrow.weight}
            className={`flex-1 text-brand-text ${textRole.eyebrow.className}`}
          >
            Next Appointment
          </Typography.Paragraph>
        </View>
        <Typography.Heading
          type={title.type}
          weight={title.weight}
          className={`${title.className} mt-0.5 pr-30`}
        >
          No upcoming appointments
        </Typography.Heading>
        <View className="mt-2 gap-1 pr-30">
          <DetailRow icon="stethoscope" text="Book a service to get started." muted />
        </View>
      </View>
    </PressableFeedback>
  );
}

function DetailRow({
  icon,
  text,
  muted = false,
}: {
  icon: IconName;
  text: string;
  muted?: boolean;
}): JSX.Element {
  const vivid = useBrandColor("brand-vivid");

  return (
    <View className="flex-row items-center gap-2.5">
      <MaterialCommunityIcons name={icon} size={iconSize.md} color={vivid} />
      <Typography.Paragraph
        type={muted ? textRole.supporting.type : textRole.detail.type}
        color={muted ? "muted" : "default"}
        className={`flex-1 ${textRole.detail.className}`}
      >
        {text}
      </Typography.Paragraph>
    </View>
  );
}

/**
 * Portrait slot at the reference proportions: 122dp wide, anchored
 * bottom-right, over soft organic peach shapes. Holds a placeholder until
 * owned doctor imagery exists; swap the inner arch for an Image then.
 */
function PortraitSlot(): JSX.Element {
  const blob = useBrandColor("brand-blob");

  return (
    <View
      className="absolute bottom-0 right-0 h-full w-38"
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      <View className="absolute -bottom-6 -right-8 size-40 rounded-full bg-brand-subtle" />
      <View className="absolute -right-4 top-6 size-24 rounded-full bg-brand-blob opacity-70" />
      <View className="absolute bottom-0 right-3 h-30 w-30.5 items-center justify-end overflow-hidden rounded-t-full bg-surface/70">
        <MaterialCommunityIcons name="doctor" size={104} color={blob} />
      </View>
    </View>
  );
}
