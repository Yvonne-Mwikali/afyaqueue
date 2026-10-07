import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PressableFeedback, Typography } from "heroui-native";
import type { JSX } from "react";
import { View } from "react-native";

import { type IconName, IconTile } from "@/components/ui/icon-tile";
import { iconSize, textRole, useBrandColor } from "@/design-system";
import type { ServiceSummary } from "@/features/services/service-catalog";

/** One-line context at the top of booking: service, doctor choice and duration, with Change. */
export function BookingContext({
  service,
  doctorLabel,
  onChange,
}: {
  service: ServiceSummary;
  doctorLabel: string;
  onChange: () => void;
}): JSX.Element {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl bg-surface-secondary px-3 py-2">
      <IconTile icon={service.icon} size="sm" {...(service.tint ? { tint: service.tint } : {})} />
      <View className="flex-1">
        <Typography type={textRole.supporting.type} weight="semibold" numberOfLines={1}>
          {service.name} · {service.durationMinutes} min
        </Typography>
        <Typography type={textRole.caption.type} color="muted" numberOfLines={1}>
          {doctorLabel}
        </Typography>
      </View>
      <PressableFeedback
        onPress={onChange}
        accessibilityRole="button"
        accessibilityLabel="Change doctor"
        hitSlop={10}
      >
        <Typography type={textRole.supporting.type} weight="semibold" className="text-brand-text">
          Change
        </Typography>
      </PressableFeedback>
    </View>
  );
}

type SummaryRow = { icon: IconName; text: string };

/**
 * Compact "when and where" summary above the Confirm button. Service and
 * doctor are already shown at the top, so they are not repeated here.
 */
export function BookingSummaryCard({ rows }: { rows: SummaryRow[] }): JSX.Element {
  const vivid = useBrandColor("brand-vivid");

  return (
    <View
      className="gap-1 rounded-2xl bg-surface-secondary px-3.5 py-2.5"
      accessible
      accessibilityLabel={`Appointment summary. ${rows.map((row) => row.text).join(". ")}`}
    >
      {rows.map((row) => (
        <View key={`${row.icon}-${row.text}`} className="flex-row items-center gap-2.5">
          <MaterialCommunityIcons name={row.icon} size={iconSize.sm} color={vivid} />
          <Typography.Paragraph type={textRole.supporting.type} className="flex-1">
            {row.text}
          </Typography.Paragraph>
        </View>
      ))}
    </View>
  );
}
