import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Typography } from "heroui-native";
import type { JSX } from "react";
import { View } from "react-native";

import { textRole, useBrandColor } from "@/design-system";

/** The AfyaQueue mark: heart-pulse icon and two-tone wordmark. */
export function BrandWordmark({ className = "" }: { className?: string }): JSX.Element {
  const vivid = useBrandColor("brand-vivid");
  const wordmark = textRole.wordmark;

  return (
    <View
      className={`flex-row items-center gap-1 ${className}`}
      accessible
      accessibilityRole="header"
      accessibilityLabel="AfyaQueue"
    >
      <MaterialCommunityIcons name="heart-pulse" size={40} color={vivid} />
      <Typography type={wordmark.type} weight={wordmark.weight} className={wordmark.className}>
        Afya
        <Typography
          type={wordmark.type}
          weight={wordmark.weight}
          className={`${wordmark.className} text-brand-vivid`}
        >
          Queue
        </Typography>
      </Typography>
    </View>
  );
}
