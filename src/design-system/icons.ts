/**
 * Icon sizes. AfyaQueue uses MaterialCommunityIcons (outline style) from
 * @expo/vector-icons throughout so stroke weight and style stay consistent.
 *
 * - sm: inline with supporting text, chevrons
 * - md: inside icon tiles and list rows
 * - lg: standalone actions
 */
export const iconSize = {
  sm: 16,
  md: 20,
  lg: 24,
} as const;

export type IconSize = keyof typeof iconSize;
