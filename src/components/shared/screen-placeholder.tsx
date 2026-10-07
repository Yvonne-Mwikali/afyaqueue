import { Typography } from "heroui-native";
import type { JSX } from "react";
import { View } from "react-native";

import { Screen } from "@/components/ui/screen";
import { textRole } from "@/design-system";

type ScreenPlaceholderProps = {
  title: string;
  description?: string;
};

/**
 * Temporary body for routes whose screens have not been designed yet.
 * Replace per route as each screen is built; delete once none remain.
 */
export function ScreenPlaceholder({ title, description }: ScreenPlaceholderProps): JSX.Element {
  return (
    <Screen>
      <View className="gap-2">
        <Typography.Heading type={textRole.screenTitle.type}>{title}</Typography.Heading>
        {description ? (
          <Typography.Paragraph type={textRole.supporting.type} color="muted">
            {description}
          </Typography.Paragraph>
        ) : null}
      </View>
    </Screen>
  );
}
