import { Chip } from "heroui-native";
import type { JSX } from "react";
import { ScrollView } from "react-native";

type FilterChipsProps<T extends string> = {
  options: { id: T; label: string }[];
  selected: T;
  onSelect: (id: T) => void;
};

/**
 * Single-select row of filter chips that scrolls horizontally. The selected
 * chip is the orange CTA gradient; the rest are neutral cream.
 */
export function FilterChips<T extends string>({
  options,
  selected,
  onSelect,
}: FilterChipsProps<T>): JSX.Element {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="-mx-4"
      contentContainerClassName="gap-2 px-4"
    >
      {options.map((option) => {
        const isSelected = option.id === selected;
        return (
          <Chip
            key={option.id}
            size="lg"
            variant={isSelected ? "primary" : "secondary"}
            color={isSelected ? "accent" : "default"}
            onPress={() => onSelect(option.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            hitSlop={8}
            className={`h-9 px-4 ${
              isSelected ? "bg-linear-to-r from-cta-from to-cta-to" : "bg-surface-secondary"
            }`}
          >
            <Chip.Label className={isSelected ? "font-semibold" : "font-medium text-foreground"}>
              {option.label}
            </Chip.Label>
          </Chip>
        );
      })}
    </ScrollView>
  );
}
