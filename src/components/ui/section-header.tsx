import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PressableFeedback, Typography } from "heroui-native";
import type { JSX } from "react";
import { View } from "react-native";

import { iconSize, textRole, useBrandColor } from "@/design-system";

type SectionHeaderProps = {
  title: string;
  /** Optional trailing pill link, e.g. "View all →". */
  action?: {
    label: string;
    onPress: () => void;
    accessibilityHint?: string;
  };
};

export function SectionHeader({ title, action }: SectionHeaderProps): JSX.Element {
  const subtleForeground = useBrandColor("brand-subtle-foreground");
  const role = textRole.sectionTitle;

  return (
    <View className="flex-row items-center justify-between gap-3">
      <Typography.Heading
        type={role.type}
        weight={role.weight}
        accessibilityRole="header"
        className="flex-1"
      >
        {title}
      </Typography.Heading>
      {action ? (
        <PressableFeedback
          onPress={action.onPress}
          accessibilityRole="link"
          accessibilityHint={action.accessibilityHint}
          hitSlop={8}
          className="h-9 flex-row items-center gap-1 rounded-full bg-brand-subtle px-3.5"
        >
          <Typography.Paragraph
            type={textRole.supporting.type}
            weight="semibold"
            className="text-brand-subtle-foreground"
          >
            {action.label}
          </Typography.Paragraph>
          <MaterialCommunityIcons name="arrow-right" size={iconSize.sm} color={subtleForeground} />
        </PressableFeedback>
      ) : null}
    </View>
  );
}
