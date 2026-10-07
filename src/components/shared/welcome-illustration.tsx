import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { JSX } from "react";
import { View } from "react-native";

import { BreathingHalo } from "@/components/feedback/motifs";
import type { IconName } from "@/components/ui/icon-tile";
import { useBrandColor } from "@/design-system";

const FLOATING: { icon: IconName; className: string }[] = [
  { icon: "calendar-month-outline", className: "left-2 top-24" },
  { icon: "clock-outline", className: "right-2 top-10" },
  { icon: "account-group-outline", className: "bottom-12 right-0" },
];

/**
 * Welcome hero: layered peach circles around a care mark, with floating
 * tiles for booking, waiting time and the queue. Stands in for the
 * reference portrait until real photography exists. Decorative only.
 */
export function WelcomeIllustration(): JSX.Element {
  const vivid = useBrandColor("brand-vivid");

  return (
    <View
      className="size-72 items-center justify-center self-center"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <View className="absolute size-64 rounded-full bg-brand-subtle" />
      <View className="absolute -right-1 bottom-6 size-28 rounded-full bg-brand-blob opacity-50" />
      <View className="absolute bottom-16 left-0 size-6 rounded-full bg-brand-blob" />
      <View className="absolute right-12 top-2 size-4 rounded-full bg-brand-blob" />
      <BreathingHalo size={184} />
      <View className="size-36 items-center justify-center rounded-full bg-surface shadow-surface">
        <MaterialCommunityIcons name="stethoscope" size={72} color={vivid} />
      </View>
      {FLOATING.map(({ icon, className }) => (
        <View
          key={icon}
          className={`absolute size-14 items-center justify-center rounded-2xl bg-surface shadow-surface ${className}`}
        >
          <MaterialCommunityIcons name={icon} size={28} color={vivid} />
        </View>
      ))}
    </View>
  );
}
