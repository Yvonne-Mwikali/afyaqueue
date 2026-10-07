import { Typography } from "heroui-native";
import type { JSX } from "react";
import { View } from "react-native";

import { textRole } from "@/design-system";

import { BreathingHalo } from "./motifs";

type QueueWaitingStateProps = {
  queueNumber: number;
  /** e.g. "4 ahead · ~25 min". */
  status: string;
};

/**
 * The patient's live queue number with a calm breathing halo: the position
 * is active and updating. For the future Live Queue screen.
 */
export function QueueWaitingState({ queueNumber, status }: QueueWaitingStateProps): JSX.Element {
  return (
    <View
      className="items-center gap-2"
      accessible
      accessibilityLabel={`Your queue number is ${queueNumber}. ${status}`}
      accessibilityLiveRegion="polite"
    >
      <View className="size-36 items-center justify-center">
        <BreathingHalo size={144} />
        <View className="size-28 items-center justify-center rounded-full bg-surface">
          <Typography type={textRole.metric.type} weight="bold" className="text-brand-text">
            #{queueNumber}
          </Typography>
        </View>
      </View>
      <View className="flex-row items-center gap-1.5">
        <View className="size-2 rounded-full bg-success" />
        <Typography type={textRole.supporting.type} color="muted">
          {status}
        </Typography>
      </View>
    </View>
  );
}
