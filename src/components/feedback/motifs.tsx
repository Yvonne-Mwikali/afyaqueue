import { MaterialCommunityIcons } from "@expo/vector-icons";
import { type JSX, useEffect } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import type { IconName } from "@/components/ui/icon-tile";
import { easing, loop, useBrandColor } from "@/design-system";

/** Shared value that runs 0 → 1 forever (or stays at 0 when motion is reduced). */
function useLoop(period: number, delay = 0): SharedValue<number> {
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      t.set(0);
      return;
    }
    t.set(
      withDelay(delay, withRepeat(withTiming(1, { duration: period, easing: easing.linear }), -1))
    );
    return () => cancelAnimation(t);
  }, [reduceMotion, period, delay, t]);

  return t;
}

const DOT_COUNT = 4;
const DOT_SIZE = 10;
const DOT_SPACING = 18;

/**
 * Queue motif: four small "patients" stepping forward in line. The front
 * dot moves out and a new one fades in at the back. Static with reduced motion.
 */
export function QueueDots(): JSX.Element {
  const t = useLoop(loop.queue);

  return (
    <View
      style={{ width: DOT_SPACING * (DOT_COUNT - 1) + DOT_SIZE, height: DOT_SIZE }}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      {Array.from({ length: DOT_COUNT }, (_, index) => (
        <QueueDot key={index} index={index} t={t} />
      ))}
    </View>
  );
}

function QueueDot({ index, t }: { index: number; t: SharedValue<number> }): JSX.Element {
  const style = useAnimatedStyle(() => {
    // Position along the line: 0 (back) … DOT_COUNT (just past the front).
    const position = (index + t.get()) % DOT_COUNT;
    return {
      transform: [{ translateX: position * DOT_SPACING }],
      opacity:
        interpolate(
          position,
          [0, 0.6, DOT_COUNT - 1, DOT_COUNT],
          [0, 1, 1, 0],
          Extrapolation.CLAMP
        ) *
        // Dots nearer the front read slightly stronger.
        (0.45 + 0.55 * Math.min(position / (DOT_COUNT - 1), 1)),
    };
  });

  return (
    <Animated.View
      className="absolute left-0 top-0 rounded-full bg-brand-vivid"
      style={[{ width: DOT_SIZE, height: DOT_SIZE }, style]}
    />
  );
}

/**
 * Status badge: an icon in a peach circle with soft rings expanding behind
 * it. One faint static ring when motion is reduced.
 */
export function PulseBadge({ icon, size = 88 }: { icon: IconName; size?: number }): JSX.Element {
  const vivid = useBrandColor("brand-vivid");

  return (
    <View
      className="items-center justify-center"
      style={{ width: size * 1.8, height: size * 1.8 }}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <PulseRing size={size} delay={0} />
      <PulseRing size={size} delay={loop.rings / 2} />
      <View
        className="items-center justify-center rounded-full bg-brand-subtle"
        style={{ width: size, height: size }}
      >
        <MaterialCommunityIcons name={icon} size={size * 0.45} color={vivid} />
      </View>
    </View>
  );
}

function PulseRing({ size, delay }: { size: number; delay: number }): JSX.Element {
  const reduceMotion = useReducedMotion();
  const t = useLoop(loop.rings, delay);
  const style = useAnimatedStyle(() =>
    reduceMotion
      ? { opacity: 0.35, transform: [{ scale: 1.25 }] }
      : {
          opacity: interpolate(t.get(), [0, 0.15, 1], [0, 0.45, 0]),
          transform: [{ scale: interpolate(t.get(), [0, 1], [1, 1.8]) }],
        }
  );

  return (
    <Animated.View
      className="absolute rounded-full border-2 border-brand-vivid/40 bg-brand-subtle/40"
      style={[{ width: size, height: size }, style]}
    />
  );
}

/**
 * Breathing glow for a live value such as a queue number: says "active and
 * updating", not "loading". A still soft halo when motion is reduced.
 */
export function BreathingHalo({ size }: { size: number }): JSX.Element {
  const reduceMotion = useReducedMotion();
  const t = useLoop(loop.breathe);
  const style = useAnimatedStyle(() => {
    // 0 → 1 → 0 over one period.
    const wave = reduceMotion ? 0.5 : 1 - Math.abs(t.get() * 2 - 1);
    return {
      opacity: 0.25 + 0.3 * wave,
      transform: [{ scale: 1 + 0.08 * wave }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      className="absolute rounded-full bg-brand-subtle"
      style={[{ width: size, height: size }, style]}
    />
  );
}
