import { Easing } from "react-native-reanimated";

/**
 * Motion should feel calm and reassuring: short, decelerating, never bouncy
 * on clinical information. Respect the OS "reduce motion" setting
 * (Reanimated's `useReducedMotion`) for anything beyond state feedback.
 */
export const duration = {
  /** Press feedback, toggles. */
  fast: 150,
  /** Element enter/exit, content changes. */
  base: 250,
  /** Large surfaces: sheets, full-screen transitions. */
  slow: 400,
} as const;

export const easing = {
  /** Default for elements entering or changing. */
  standard: Easing.bezier(0.2, 0, 0, 1),
  /** Elements leaving the screen. */
  exit: Easing.bezier(0.3, 0, 1, 1),
} as const;

export const spring = {
  /** Gentle settle for sheets and layout changes; no visible overshoot. */
  gentle: { damping: 26, stiffness: 220, mass: 1 },
  /** Quick, crisp response for small elements (e.g. a queue position update). */
  snappy: { damping: 22, stiffness: 340, mass: 0.8 },
} as const;
