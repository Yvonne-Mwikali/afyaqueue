import { PressableFeedback, Typography } from "heroui-native";
import type { JSX } from "react";
import { View } from "react-native";

import { textRole } from "@/design-system";

type Segment<T extends string> = { id: T; label: string; count?: number };

type SegmentedTabsProps<T extends string> = {
  segments: Segment<T>[];
  selected: T;
  onSelect: (id: T) => void;
};

/** Equal-width segments; selected = light peach with orange text. Optional quiet count. */
export function SegmentedTabs<T extends string>({
  segments,
  selected,
  onSelect,
}: SegmentedTabsProps<T>): JSX.Element {
  return (
    <View
      className="flex-row gap-1 rounded-2xl bg-surface-secondary p-0.5"
      accessibilityRole="tablist"
    >
      {segments.map((segment) => {
        const isSelected = segment.id === selected;
        const count = segment.count ?? 0;
        return (
          <PressableFeedback
            key={segment.id}
            onPress={() => onSelect(segment.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={count > 0 ? `${segment.label}, ${count}` : segment.label}
            // 36dp segments; hit area extends to 48dp.
            hitSlop={6}
            className="flex-1 rounded-xl"
          >
            <View
              className={`min-h-9 flex-row items-center justify-center gap-1 rounded-xl px-2 ${
                isSelected ? "bg-brand-subtle" : ""
              }`}
            >
              <Typography
                type={textRole.supporting.type}
                weight={isSelected ? "semibold" : "medium"}
                numberOfLines={1}
                className={isSelected ? "text-brand-subtle-foreground" : "text-muted"}
              >
                {segment.label}
              </Typography>
              {count > 0 ? (
                <Typography
                  type={textRole.caption.type}
                  className={isSelected ? "text-brand-subtle-foreground" : "text-muted"}
                >
                  {count}
                </Typography>
              ) : null}
            </View>
          </PressableFeedback>
        );
      })}
    </View>
  );
}
