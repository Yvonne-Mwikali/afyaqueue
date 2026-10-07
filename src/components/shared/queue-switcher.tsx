import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PressableFeedback, Typography, useThemeColor } from "heroui-native";
import type { JSX } from "react";
import { View } from "react-native";

import { StatusText } from "@/components/ui/status-text";
import { iconSize, textRole, useBrandColor } from "@/design-system";
import { type QueueEntry, queueStatusPresentation } from "@/features/queues/queue-entry";

export type QueueOption = { entry: QueueEntry; serviceName: string };

type QueueSwitcherProps = {
  options: QueueOption[];
  selectedId: string;
  onSelect: (entryId: string) => void;
};

/**
 * Today's queues in one Visit. Choosing one only changes which queue is
 * shown; the patient can never change their position.
 */
export function QueueSwitcher({ options, selectedId, onSelect }: QueueSwitcherProps): JSX.Element {
  const vivid = useBrandColor("brand-vivid");
  const muted = useThemeColor("muted");

  return (
    <View className="gap-2">
      <Typography type={textRole.supporting.type} weight="semibold" color="muted" className="px-1">
        Your queues today
      </Typography>
      <View className="gap-1.5" accessibilityRole="radiogroup">
        {options.map(({ entry, serviceName }) => {
          const selected = entry.id === selectedId;
          const { label, tone } = queueStatusPresentation(entry);
          return (
            <PressableFeedback
              key={entry.id}
              onPress={() => onSelect(entry.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${serviceName} queue, number ${entry.queueNumber}, ${label}`}
              accessibilityHint={selected ? undefined : "Shows this queue above"}
              className="rounded-2xl"
            >
              <View
                className={`min-h-12 flex-row items-center gap-3 rounded-2xl border px-3.5 py-2 ${
                  selected ? "border-brand-vivid/60 bg-brand-subtle/40" : "border-border"
                }`}
              >
                <View className="flex-1 gap-0.5">
                  <Typography
                    type={textRole.supporting.type}
                    weight={selected ? "semibold" : "medium"}
                    className={selected ? "" : "text-muted"}
                  >
                    {serviceName} · #{entry.queueNumber}
                  </Typography>
                  <StatusText label={label} tone={tone} />
                </View>
                <MaterialCommunityIcons
                  name={selected ? "check-circle" : "chevron-right"}
                  size={iconSize.md}
                  color={selected ? vivid : muted}
                />
              </View>
            </PressableFeedback>
          );
        })}
      </View>
    </View>
  );
}
