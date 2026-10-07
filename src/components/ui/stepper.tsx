import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Typography, useThemeColor } from "heroui-native";
import { Fragment, type JSX } from "react";
import { View } from "react-native";

import { textRole } from "@/design-system";

type StepperProps = {
  steps: string[];
  /** Index of the current step; earlier steps show as done. */
  current: number;
};

/** One-line progress: small dot + label per step, joined by short lines. */
export function Stepper({ steps, current }: StepperProps): JSX.Element {
  const onAccent = useThemeColor("accent-foreground");

  return (
    <View
      className="flex-row items-center gap-2"
      accessible
      accessibilityLabel={`Step ${current + 1} of ${steps.length}: ${steps[current] ?? ""}`}
    >
      {steps.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <Fragment key={label}>
            {index > 0 ? (
              <View
                className={`h-px flex-1 ${index <= current ? "bg-brand-vivid/50" : "bg-separator"}`}
              />
            ) : null}
            <View className="flex-row items-center gap-1.5">
              <View
                className={`size-4 items-center justify-center rounded-full ${
                  done || active ? "bg-accent" : "border border-separator bg-surface"
                }`}
              >
                {done ? <MaterialCommunityIcons name="check" size={10} color={onAccent} /> : null}
              </View>
              <Typography
                type={textRole.micro.type}
                weight={active ? "semibold" : "normal"}
                numberOfLines={1}
                className={`${textRole.micro.className} ${active ? "text-brand-text" : "text-muted"}`}
              >
                {label}
              </Typography>
            </View>
          </Fragment>
        );
      })}
    </View>
  );
}
