import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Button, useThemeColor } from "heroui-native";
import type { JSX } from "react";
import { View } from "react-native";

import { elevation, iconSize } from "@/design-system";

import type { IconName } from "./icon-tile";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  accessibilityHint?: string;
  isDisabled?: boolean;
};

/**
 * The screen's single strongest action: full-width 48dp orange gradient
 * with a soft glow, optional leading icon and trailing chevron. Every stop
 * of the gradient meets WCAG AA (>= 4.6:1) with the white label.
 */
export function PrimaryButton({
  label,
  onPress,
  icon,
  accessibilityHint,
  isDisabled = false,
}: PrimaryButtonProps): JSX.Element {
  const [onAccent, muted] = useThemeColor(["accent-foreground", "muted"]);
  // Disabled is a flat neutral button (no gradient, no glow), not a faded orange one.
  const foreground = isDisabled ? muted : onAccent;

  return (
    <View className={`rounded-2xl ${isDisabled ? "" : elevation.cta}`}>
      <Button
        onPress={onPress}
        isDisabled={isDisabled}
        accessibilityHint={accessibilityHint}
        className={`h-11.5 rounded-2xl ${
          isDisabled ? "bg-default opacity-100" : "bg-linear-to-r from-cta-from to-cta-to"
        }`}
      >
        {icon ? <MaterialCommunityIcons name={icon} size={iconSize.lg} color={foreground} /> : null}
        <Button.Label className={`font-semibold ${isDisabled ? "text-muted" : ""}`}>
          {label}
        </Button.Label>
        <View className="absolute right-4" pointerEvents="none">
          <MaterialCommunityIcons name="chevron-right" size={iconSize.lg} color={foreground} />
        </View>
      </Button>
    </View>
  );
}
