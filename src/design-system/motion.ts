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
  /** Whole success sequence (ring settles, check draws, one soft pulse). Keep 500–900. */
  success: 750,
} as const;

/**
 * Looping periods (one full cycle) for ambient "work is happening" motion.
 * Slow enough to read as calm, never as frantic spinning.
 */
export const loop = {
  /** Queue dots stepping forward. */
  queue: 1600,
  /** Expanding rings behind a status badge. */
  rings: 2000,
  /** Breathing glow around a live queue number. */
  breathe: 2600,
} as const;

export const easing = {
  /** Default for elements entering or changing. */
  standard: Easing.bezier(0.2, 0, 0, 1),
  /** Elements leaving the screen. */
  exit: Easing.bezier(0.3, 0, 1, 1),
  /** Symmetric ease for breathing/pulsing loops. */
  inOut: Easing.inOut(Easing.quad),
  /** Constant speed, for conveyor-style loops. */
  linear: Easing.linear,
} as const;

export const spring = {
  /** Gentle settle for sheets and layout changes; no visible overshoot. */
  gentle: { damping: 26, stiffness: 220, mass: 1 },
  /** Quick, crisp response for small elements (e.g. a queue position update). */
  snappy: { damping: 22, stiffness: 340, mass: 0.8 },
  /** Success marks: a single small overshoot, then rest. */
  settle: { damping: 14, stiffness: 200, mass: 0.9 },
} as const;
