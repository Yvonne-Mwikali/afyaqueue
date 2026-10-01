import { Typography } from "heroui-native";
import type { JSX } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { layout, textRole } from "@/design-system";

type ScreenPlaceholderProps = {
  title: string;
  description?: string;
};

/**
 * Temporary body for routes whose screens have not been designed yet.
 * Replace per route as each screen is built; delete once none remain.
 */
export function ScreenPlaceholder({ title, description }: ScreenPlaceholderProps): JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingTop: insets.top + layout.sectionGap,
        paddingHorizontal: layout.screenGutter,
      }}
    >
      <View className="gap-2">
        <Typography.Heading type={textRole.screenTitle.type}>{title}</Typography.Heading>
        {description ? (
          <Typography.Paragraph type={textRole.supporting.type} color="muted">
            {description}
          </Typography.Paragraph>
        ) : null}
      </View>
    </ScrollView>
  );
}
