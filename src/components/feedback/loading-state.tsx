import { Typography } from "heroui-native";
import type { JSX } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import type { IconName } from "@/components/ui/icon-tile";
import { duration, textRole } from "@/design-system";

import { PulseBadge, QueueDots } from "./motifs";

type LoadingStateProps = {
  /** Short status, e.g. "Finding available doctors". Always shown: motion is never the only signal. */
  title: string;
  message?: string;
  /** Icon badge with soft rings (e.g. booking, check-in); queue dots when omitted. */
  icon?: IconName;
  /** Cover the whole screen (blocks input while work completes). */
  fullScreen?: boolean;
};

/**
 * AfyaQueue loading state for fetching and submitting: a small looping
 * motif with contextual text. Use for unknown-duration work; use
 * ProgressState when real progress is known.
 */
export function LoadingState({
  title,
  message,
  icon,
  fullScreen = false,
}: LoadingStateProps): JSX.Element {
  return (
    <Animated.View
      entering={FadeIn.duration(duration.base)}
      className={`items-center justify-center gap-4 ${fullScreen ? "bg-background px-8" : "py-10"}`}
      style={fullScreen ? [StyleSheet.absoluteFill, { zIndex: 20 }] : undefined}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={message ? `${title}. ${message}` : title}
      accessibilityLiveRegion="polite"
    >
      {icon ? <PulseBadge icon={icon} /> : <QueueDots />}
      <View className="items-center gap-1">
        <Typography
          type={textRole.cardPrimary.type}
          weight={textRole.cardPrimary.weight}
          align="center"
        >
          {title}
        </Typography>
        {message ? (
          <Typography.Paragraph type={textRole.supporting.type} color="muted" align="center">
            {message}
          </Typography.Paragraph>
        ) : null}
      </View>
    </Animated.View>
  );
}
