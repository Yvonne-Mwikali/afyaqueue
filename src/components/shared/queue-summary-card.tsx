import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PressableFeedback, Typography, useThemeColor } from "heroui-native";
import type { JSX } from "react";
import { View } from "react-native";

import { iconSize, textRole, useBrandColor } from "@/design-system";

export type QueueSummary = {
  serviceName: string;
  queueNumber: number;
  peopleAhead: number;
  estimatedWaitMinutes: number;
};

type QueueSummaryCardProps = {
  queue: QueueSummary;
  onPress: () => void;
};

/** Compact, glanceable live-queue status; visually secondary to the appointment hero. */
export function QueueSummaryCard({ queue, onPress }: QueueSummaryCardProps): JSX.Element {
  const vivid = useBrandColor("brand-vivid");
  const muted = useThemeColor("muted");
  const { serviceName, queueNumber, peopleAhead, estimatedWaitMinutes } = queue;
  const primary = textRole.cardPrimary;

  return (
    <PressableFeedback
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Live queue, ${serviceName}. Number ${queueNumber} in line, ${peopleAhead} ahead, about ${estimatedWaitMinutes} minutes.`}
      accessibilityHint="Opens the Queue tab"
      className="rounded-3xl"
    >
      <View className="flex-row items-center gap-3 rounded-3xl border border-border bg-surface px-4 py-3">
        <MaterialCommunityIcons name="account-group" size={iconSize.lg} color={vivid} />
        <View className="flex-1">
          <Typography.Paragraph
            type={textRole.eyebrow.type}
            weight={textRole.eyebrow.weight}
            className={`text-brand-text ${textRole.eyebrow.className}`}
          >
            Live Queue
          </Typography.Paragraph>
          <Typography type={primary.type} weight={primary.weight}>
            #{queueNumber} in line
          </Typography>
          <Typography.Paragraph type={textRole.supporting.type} color="muted">
            {peopleAhead} ahead · ~{estimatedWaitMinutes} min
          </Typography.Paragraph>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={iconSize.md} color={muted} />
      </View>
    </PressableFeedback>
  );
}
