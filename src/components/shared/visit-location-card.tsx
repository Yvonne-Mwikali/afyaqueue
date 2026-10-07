import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PressableFeedback, Typography } from "heroui-native";
import type { JSX } from "react";
import { View } from "react-native";

import { textRole, useBrandColor } from "@/design-system";

export type VisitLocation = {
  facilityName: string;
  department: string;
  /** Wing and floor, e.g. "Wing B, 2nd Floor". Omitted when unknown. */
  area?: string;
};

type VisitLocationCardProps = {
  location: VisitLocation;
  onGetDirections: () => void;
};

/** Quiet supporting card: where today's visit is, plus a small Directions action. */
export function VisitLocationCard({
  location,
  onGetDirections,
}: VisitLocationCardProps): JSX.Element {
  const vivid = useBrandColor("brand-vivid");
  const where = location.area ? `${location.department} · ${location.area}` : location.department;

  return (
    <View className="flex-row items-center gap-3 rounded-3xl border border-border bg-surface px-4 py-3">
      <View className="flex-1" accessible accessibilityLabel={`${location.facilityName}, ${where}`}>
        <Typography type={textRole.cardPrimary.type} weight={textRole.cardPrimary.weight}>
          {location.facilityName}
        </Typography>
        <Typography.Paragraph type={textRole.supporting.type} color="muted">
          {where}
        </Typography.Paragraph>
      </View>
      <PressableFeedback
        onPress={onGetDirections}
        accessibilityRole="button"
        accessibilityLabel={`Get directions to ${location.facilityName}`}
        hitSlop={8}
        className="h-9 flex-row items-center gap-1 rounded-full bg-brand-subtle px-3"
      >
        <MaterialCommunityIcons name="map-marker" size={16} color={vivid} />
        <Typography
          type={textRole.caption.type}
          weight="semibold"
          className="text-brand-subtle-foreground"
        >
          Directions
        </Typography>
      </PressableFeedback>
    </View>
  );
}
