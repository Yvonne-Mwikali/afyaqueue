import { Typography, useThemeColor } from "heroui-native";
import { type JSX, type ReactNode, useEffect } from "react";
import { AccessibilityInfo, View } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { duration, easing, spring, textRole } from "@/design-system";

const AnimatedPath = Animated.createAnimatedComponent(Path);

const MARK_SIZE = 72;
/** Checkmark inside a 72dp circle, and its length for the draw-on effect. */
const CHECK_PATH = "M 22 37 L 32 47 L 51 27";
const CHECK_LENGTH = 42;

/**
 * Completion mark (~750ms): the orange circle settles in with one small
 * overshoot, the check draws on, then a single soft ring pulses out. Final
 * state immediately when motion is reduced.
 */
export function SuccessMark(): JSX.Element {
  const reduceMotion = useReducedMotion();
  const onAccent = useThemeColor("accent-foreground");
  const circle = useSharedValue(reduceMotion ? 1 : 0.6);
  const check = useSharedValue(reduceMotion ? 1 : 0);
  const pulse = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    const third = duration.success / 3;
    circle.set(withSpring(1, spring.settle));
    check.set(withDelay(third, withTiming(1, { duration: third, easing: easing.standard })));
    pulse.set(withDelay(third, withTiming(1, { duration: third * 2, easing: easing.standard })));
  }, [reduceMotion, circle, check, pulse]);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circle.get() }],
    opacity: Math.min(1, circle.get() * 1.6 - 0.6),
  }));
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - pulse.get()),
    transform: [{ scale: 1 + 0.45 * pulse.get() }],
  }));
  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: CHECK_LENGTH * (1 - check.get()),
  }));

  return (
    <View
      className="size-28 items-center justify-center"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <View className="absolute size-24 rounded-full bg-brand-subtle" />
      <Animated.View
        className="absolute rounded-full border-2 border-brand-vivid/50"
        style={[{ width: MARK_SIZE, height: MARK_SIZE }, pulseStyle]}
      />
      <Animated.View
        className="items-center justify-center rounded-full bg-linear-to-br from-cta-from to-cta-to"
        style={[{ width: MARK_SIZE, height: MARK_SIZE }, circleStyle]}
      >
        <Svg width={MARK_SIZE} height={MARK_SIZE}>
          <AnimatedPath
            d={CHECK_PATH}
            stroke={onAccent}
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={[CHECK_LENGTH, CHECK_LENGTH]}
            animatedProps={checkProps}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

type SuccessStateProps = {
  title: string;
  message?: string;
  /** Follow-up content (details, actions) revealed after the mark. */
  children?: ReactNode;
};

/** Success/completion: animated mark, title and short text, then the follow-up content. */
export function SuccessState({ title, message, children }: SuccessStateProps): JSX.Element {
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(message ? `${title}. ${message}` : title);
  }, [title, message]);

  return (
    <View className="items-center gap-3">
      <SuccessMark />
      <Animated.View
        entering={FadeIn.delay(duration.success / 2).duration(duration.base)}
        className="items-center gap-1"
      >
        <Typography
          type={textRole.cardTitle.type}
          weight={textRole.cardTitle.weight}
          align="center"
          accessibilityRole="header"
          className={textRole.cardTitle.className}
        >
          {title}
        </Typography>
        {message ? (
          <Typography.Paragraph color="muted" align="center">
            {message}
          </Typography.Paragraph>
        ) : null}
      </Animated.View>
      {children ? (
        <Animated.View
          entering={FadeIn.delay(duration.success).duration(duration.base)}
          className="w-full items-center"
        >
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
}
