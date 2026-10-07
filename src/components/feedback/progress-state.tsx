import { Typography } from "heroui-native";
import { type JSX, useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { duration, easing, textRole } from "@/design-system";

import { QueueDots } from "./motifs";

type ProgressStateProps = {
  title: string;
  /**
   * Real, measured progress from 0 to 1. Omit when progress is unknown: an
   * indeterminate motif is shown instead of an invented percentage.
   */
  progress?: number;
};

/** Determinate progress bar when progress is known; otherwise the queue-dots motif. */
export function ProgressState({ title, progress }: ProgressStateProps): JSX.Element {
  const reduceMotion = useReducedMotion();
  const known = progress !== undefined;
  const clamped = Math.min(Math.max(progress ?? 0, 0), 1);
  const percent = Math.round(clamped * 100);
  const fill = useSharedValue(clamped);

  useEffect(() => {
    fill.set(
      reduceMotion
        ? clamped
        : withTiming(clamped, { duration: duration.base, easing: easing.standard })
    );
  }, [clamped, reduceMotion, fill]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));

  return (
    <View
      className="w-full gap-2"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={title}
      accessibilityValue={known ? { min: 0, max: 100, now: percent } : undefined}
    >
      <Typography
        type={textRole.supporting.type}
        weight="semibold"
        align={known ? "start" : "center"}
      >
        {known ? `${title} · ${percent}%` : title}
      </Typography>
      {known ? (
        <View className="h-1.5 w-full overflow-hidden rounded-full bg-brand-subtle">
          <Animated.View className="h-full rounded-full bg-accent" style={fillStyle} />
        </View>
      ) : (
        <View className="items-center">
          <QueueDots />
        </View>
      )}
    </View>
  );
}
