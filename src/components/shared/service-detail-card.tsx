import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Typography } from "heroui-native";
import type { JSX } from "react";
import { View } from "react-native";

import { type IconName, IconTile } from "@/components/ui/icon-tile";
import { textRole, useBrandColor } from "@/design-system";
import { formatServiceModes, type ServiceSummary } from "@/features/services/service-catalog";

/** Service summary at the top of Service Detail: icon, name, description and key facts. */
export function ServiceDetailCard({ service }: { service: ServiceSummary }): JSX.Element {
  return (
    <View className="overflow-hidden rounded-3xl border border-border bg-linear-to-r from-hero-from to-hero-to">
      <View className="flex-row items-center gap-3 px-4 py-3">
        <IconTile icon={service.icon} {...(service.tint ? { tint: service.tint } : {})} />
        <View className="flex-1">
          <Typography type={textRole.sectionTitle.type} weight={textRole.sectionTitle.weight}>
            {service.name}
          </Typography>
          <Typography.Paragraph type={textRole.supporting.type} color="muted">
            {service.description}
          </Typography.Paragraph>
        </View>
      </View>
      <View className="flex-row bg-surface px-1 py-2">
        <Fact icon="account-tie-outline" label="Consultation" value={service.providerTitle} />
        <View className="w-px bg-separator" />
        <Fact
          icon="calendar-clock-outline"
          label="Duration"
          value={`${service.durationMinutes} min`}
        />
        <View className="w-px bg-separator" />
        <Fact icon="video-outline" label="Available" value={formatServiceModes(service.modes)} />
      </View>
    </View>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}): JSX.Element {
  const vivid = useBrandColor("brand-vivid");

  return (
    <View
      className="flex-1 flex-row items-center gap-1.5 px-2"
      accessible
      accessibilityLabel={`${label} ${value}`}
    >
      <MaterialCommunityIcons name={icon} size={18} color={vivid} />
      <View className="flex-1">
        <Typography type={textRole.caption.type} color="muted" numberOfLines={1}>
          {label}
        </Typography>
        <Typography type={textRole.caption.type} weight="semibold" numberOfLines={2}>
          {value}
        </Typography>
      </View>
    </View>
  );
}
