import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps, JSX } from "react";
import { View } from "react-native";

import { useBrandColor } from "@/design-system";

export type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

/** Category tint: peach (default) or the Oncology pink awareness tint. */
export type IconTileTint = "peach" | "pink";

const tileSize = {
  /** Inline context rows. */
  sm: { className: "size-10 rounded-xl", icon: 20 },
  /** Service shortcuts and cards. */
  md: { className: "size-14 rounded-2xl", icon: 28 },
} as const;

type IconTileProps = {
  icon: IconName;
  tint?: IconTileTint;
  size?: keyof typeof tileSize;
};

/**
 * Rounded-square tile (56dp, or 40dp `sm`) with an outline icon: warm cream→peach gradient
 * with a vivid orange icon, or pink for Oncology. Used for service shortcuts
 * and service cards.
 */
export function IconTile({ icon, tint = "peach", size = "md" }: IconTileProps): JSX.Element {
  const vivid = useBrandColor("brand-vivid");
  const pink = useBrandColor("tint-pink-foreground");
  const isPink = tint === "pink";
  const { className, icon: glyph } = tileSize[size];

  return (
    <View
      className={`${className} items-center justify-center ${
        isPink ? "bg-tint-pink" : "bg-linear-to-br from-tile-from to-tile-to"
      }`}
      importantForAccessibility="no-hide-descendants"
    >
      <MaterialCommunityIcons name={icon} size={glyph} color={isPink ? pink : vivid} />
    </View>
  );
}
