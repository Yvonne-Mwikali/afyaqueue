import { PressableFeedback, Typography } from "heroui-native";
import type { JSX } from "react";
import { View } from "react-native";

import { textRole } from "@/design-system";
import { type SlotStart, slotDate, type TimeSlot } from "@/features/appointments/availability";
import { useCompactLayout } from "@/hooks/use-compact-layout";
import { chunk } from "@/utils/chunk";
import { formatTime } from "@/utils/date-format";

type TimeSlotGridProps = {
  day: Date;
  slots: TimeSlot[];
  selected: SlotStart | null;
  onSelect: (start: SlotStart) => void;
};

/**
 * Grid of time pills (4 per row, 3 on compact layouts): selected = orange
 * gradient, available = neutral, reserved = muted and disabled.
 */
export function TimeSlotGrid({ day, slots, selected, onSelect }: TimeSlotGridProps): JSX.Element {
  const columns = useCompactLayout() ? 3 : 4;

  if (!slots.some((slot) => slot.available)) {
    return (
      <Typography.Paragraph type={textRole.supporting.type} color="muted">
        No times left on this day. Please choose another date.
      </Typography.Paragraph>
    );
  }

  return (
    <View className="gap-2" accessibilityRole="radiogroup">
      {chunk(slots, columns).map((row) => (
        <View key={row.map((slot) => slot.start).join("-")} className="flex-row gap-2">
          {row.map(({ start, available }) => {
            const isSelected = start === selected;
            const label = formatTime(slotDate(day, start));
            return (
              <PressableFeedback
                key={start}
                onPress={() => onSelect(start)}
                isDisabled={!available}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected, disabled: !available }}
                accessibilityLabel={available ? label : `${label}, unavailable`}
                // 40dp pills; hit area extends to 48dp.
                hitSlop={4}
                className="flex-1 rounded-xl"
              >
                <View
                  className={`min-h-10 items-center justify-center rounded-xl px-1 ${
                    isSelected
                      ? "bg-linear-to-r from-cta-from to-cta-to"
                      : available
                        ? "bg-surface-secondary"
                        : "bg-surface-secondary opacity-50"
                  }`}
                >
                  <Typography
                    type={textRole.supporting.type}
                    weight={isSelected ? "semibold" : "medium"}
                    numberOfLines={1}
                    className={
                      isSelected
                        ? "text-accent-foreground"
                        : available
                          ? ""
                          : "text-muted line-through"
                    }
                  >
                    {label}
                  </Typography>
                </View>
              </PressableFeedback>
            );
          })}
          {/* Keep the last row's pills the same width as full rows. */}
          {Array.from({ length: columns - row.length }, (_, i) => (
            <View key={`spacer-${i}`} className="flex-1" />
          ))}
        </View>
      ))}
    </View>
  );
}
