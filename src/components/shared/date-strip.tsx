import { PressableFeedback, Typography } from "heroui-native";
import type { JSX } from "react";
import { ScrollView, View } from "react-native";

import { textRole } from "@/design-system";
import { type DayAvailability, hasAvailability } from "@/features/appointments/availability";
import { dateCardParts, formatLongDate, isSameDay } from "@/utils/date-format";

type DateStripProps = {
  days: DayAvailability[];
  selected: Date;
  onSelect: (day: DayAvailability) => void;
};

/** Horizontal row of compact date cards; days without slots are shown but disabled. */
export function DateStrip({ days, selected, onSelect }: DateStripProps): JSX.Element {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="-mx-4"
      contentContainerClassName="gap-2 px-4"
      accessibilityRole="radiogroup"
    >
      {days.map((day) => {
        const isSelected = isSameDay(day.date, selected);
        const available = hasAvailability(day);
        const { weekday, day: dayOfMonth, month } = dateCardParts(day.date);
        return (
          <PressableFeedback
            key={day.date.toISOString()}
            onPress={() => onSelect(day)}
            isDisabled={!available}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected, disabled: !available }}
            accessibilityLabel={`${formatLongDate(day.date)}${available ? "" : ", no availability"}`}
            className="rounded-xl"
          >
            {/* 48×60: same surfaces as the time pills; selected = orange fill. */}
            <View
              className={`h-15 w-12 items-center justify-center rounded-xl ${
                isSelected ? "bg-linear-to-br from-cta-from to-cta-to" : "bg-surface-secondary"
              } ${available ? "" : "opacity-40"}`}
            >
              <Typography
                type={textRole.micro.type}
                className={`${textRole.micro.className} ${
                  isSelected ? "text-accent-foreground" : "text-muted"
                }`}
              >
                {weekday}
              </Typography>
              <Typography
                type={textRole.itemTitle.type}
                weight="bold"
                className={isSelected ? "text-accent-foreground" : ""}
              >
                {dayOfMonth}
              </Typography>
              <Typography
                type={textRole.micro.type}
                className={`${textRole.micro.className} ${
                  isSelected ? "text-accent-foreground" : "text-muted"
                }`}
              >
                {month}
              </Typography>
            </View>
          </PressableFeedback>
        );
      })}
    </ScrollView>
  );
}
