import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PressableFeedback, Typography } from "heroui-native";
import type { JSX } from "react";
import { View } from "react-native";

import { iconSize, textRole, useBrandColor } from "@/design-system";

type ScreenHeaderProps = {
  title: string;
  onBack: () => void;
};

/** Header for pushed screens: orange back arrow and a centred title. */
export function ScreenHeader({ title, onBack }: ScreenHeaderProps): JSX.Element {
  const vivid = useBrandColor("brand-vivid");
  const role = textRole.cardPrimary;

  return (
    <View className="h-14 flex-row items-center">
      <PressableFeedback
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Back"
        className="-ml-3 size-12 items-center justify-center rounded-full"
      >
        <MaterialCommunityIcons name="arrow-left" size={iconSize.lg} color={vivid} />
      </PressableFeedback>
      <Typography
        type={role.type}
        weight={role.weight}
        align="center"
        numberOfLines={1}
        accessibilityRole="header"
        className="flex-1"
      >
        {title}
      </Typography>
      {/* Balances the back button so the title stays centred. */}
      <View className="size-12" />
    </View>
  );
}
