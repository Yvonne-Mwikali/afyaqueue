import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomSheet, PressableFeedback, Typography } from "heroui-native";
import type { JSX } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { iconSize, spacing, textRole, useBrandColor } from "@/design-system";
import { THEME_OPTIONS, type ThemePreference } from "@/features/preferences/theme-preference";

type AppearanceSheetProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selected: ThemePreference;
  onSelect: (preference: ThemePreference) => void;
};

/** System / Light / Dark choice. Applies on tap and closes. */
export function AppearanceSheet({
  isOpen,
  onOpenChange,
  selected,
  onSelect,
}: AppearanceSheetProps): JSX.Element {
  const insets = useSafeAreaInsets();
  const vivid = useBrandColor("brand-vivid");

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content>
          <View className="gap-3" style={{ paddingBottom: insets.bottom + spacing.sm }}>
            <BottomSheet.Title>Appearance</BottomSheet.Title>
            <View className="gap-1.5" accessibilityRole="radiogroup">
              {THEME_OPTIONS.map((option) => {
                const isSelected = option.id === selected;
                return (
                  <PressableFeedback
                    key={option.id}
                    onPress={() => {
                      onSelect(option.id);
                      onOpenChange(false);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={`${option.label}, ${option.description}`}
                    className="rounded-2xl"
                  >
                    <View
                      className={`min-h-14 flex-row items-center gap-3 rounded-2xl border px-3.5 py-2 ${
                        isSelected ? "border-brand-vivid/60 bg-brand-subtle/40" : "border-border"
                      }`}
                    >
                      <View className="flex-1">
                        <Typography
                          type={textRole.body.type}
                          weight={isSelected ? "semibold" : "medium"}
                        >
                          {option.label}
                        </Typography>
                        <Typography type={textRole.supporting.type} color="muted">
                          {option.description}
                        </Typography>
                      </View>
                      {isSelected ? (
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={iconSize.md}
                          color={vivid}
                        />
                      ) : null}
                    </View>
                  </PressableFeedback>
                );
              })}
            </View>
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
