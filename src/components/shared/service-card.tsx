import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PressableFeedback, Typography } from "heroui-native";
import type { JSX } from "react";
import { View } from "react-native";

import { IconTile } from "@/components/ui/icon-tile";
import { iconSize, textRole, useBrandColor } from "@/design-system";
import type { ServiceSummary } from "@/features/services/service-catalog";

type ServiceCardProps = {
  service: ServiceSummary;
  onPress: () => void;
};

/**
 * Light service card for the two-column Services grid: icon tile, name,
 * two-line description and a "View Details" link, with soft decorative
 * circles in the top-right corner.
 */
export function ServiceCard({ service, onPress }: ServiceCardProps): JSX.Element {
  const brandText = useBrandColor("brand-text");
  const isPink = service.tint === "pink";

  return (
    <PressableFeedback
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${service.name}. ${service.description}`}
      accessibilityHint="Choose a doctor for this service"
      className="flex-1 rounded-3xl"
    >
      <View className="flex-1 gap-3 overflow-hidden rounded-3xl border border-border bg-surface p-3.5 shadow-surface">
        {/* Decorative corner circles. */}
        <View
          className={`absolute -right-8 -top-8 size-24 rounded-full ${
            isPink ? "bg-tint-pink" : "bg-brand-subtle"
          } opacity-60`}
          pointerEvents="none"
        />
        <View
          className="absolute -right-3 -top-3 size-14 rounded-full bg-surface-secondary opacity-80"
          pointerEvents="none"
        />

        <IconTile icon={service.icon} {...(service.tint ? { tint: service.tint } : {})} />

        <View className="flex-1 gap-0.5">
          <Typography type={textRole.itemTitle.type} weight={textRole.itemTitle.weight}>
            {service.name}
          </Typography>
          <Typography.Paragraph
            type={textRole.supporting.type}
            color="muted"
            numberOfLines={2}
            className="leading-5"
          >
            {service.description}
          </Typography.Paragraph>
        </View>

        <View className="flex-row items-center justify-between">
          <Typography.Paragraph
            type={textRole.supporting.type}
            weight="bold"
            className="text-brand-text"
          >
            View Details
          </Typography.Paragraph>
          <MaterialCommunityIcons name="chevron-right" size={iconSize.md} color={brandText} />
        </View>
      </View>
    </PressableFeedback>
  );
}
