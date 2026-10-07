import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { PressableFeedback, Typography } from "heroui-native";
import type { JSX, ReactNode } from "react";
import { KeyboardAvoidingView, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandWordmark } from "@/components/shared/brand-wordmark";
import { iconSize, layout, spacing, textRole, useBrandColor } from "@/design-system";

type AuthScreenProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

/**
 * Shared frame for Login and Register: warm cream page, brand row with a
 * back arrow when there is somewhere to go back to, a short heading beside
 * a soft decorative mark, then the form on a white sheet. Scrolls and moves
 * clear of the keyboard.
 */
export function AuthScreen({ title, subtitle, children }: AuthScreenProps): JSX.Element {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const vivid = useBrandColor("brand-vivid");

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-surface-secondary">
      <AuthBackdrop />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + spacing.sm,
          paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.lg,
          paddingHorizontal: layout.screenGutter,
          gap: spacing.xl,
        }}
      >
        <View className="h-12 flex-row items-center">
          {router.canGoBack() ? (
            <PressableFeedback
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Back"
              className="-ml-3 size-12 items-center justify-center rounded-full"
            >
              <MaterialCommunityIcons name="arrow-left" size={iconSize.lg} color={vivid} />
            </PressableFeedback>
          ) : null}
          <BrandWordmark />
        </View>

        <View className="gap-1.5 pr-24">
          <Typography
            type={textRole.pageTitle.type}
            weight={textRole.pageTitle.weight}
            accessibilityRole="header"
          >
            {title}
          </Typography>
          <Typography type={textRole.supporting.type} color="muted">
            {subtitle}
          </Typography>
        </View>

        <View className="gap-4 rounded-3xl bg-surface p-4 shadow-surface">{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Soft peach shapes in the top-right corner, standing in for the reference portrait. */
function AuthBackdrop(): JSX.Element {
  const vivid = useBrandColor("brand-vivid");
  return (
    <View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      className="absolute right-0 top-0 h-80 w-56 overflow-hidden"
    >
      <View className="absolute -right-20 -top-12 size-64 rounded-full bg-brand-subtle" />
      <View className="absolute -right-6 top-28 size-36 rounded-full bg-brand-blob opacity-60" />
      <View className="absolute right-12 top-40 size-12 items-center justify-center rounded-full bg-surface shadow-surface">
        <MaterialCommunityIcons name="heart" size={iconSize.md} color={vivid} />
      </View>
    </View>
  );
}

type AuthSwitchProps = { prompt: string; action: string; onPress: () => void };

/** "Don't have an account? Register" footer link. */
export function AuthSwitch({ prompt, action, onPress }: AuthSwitchProps): JSX.Element {
  return (
    <View className="flex-row items-center justify-center">
      <Typography type={textRole.supporting.type} color="muted">
        {prompt}{" "}
      </Typography>
      <PressableFeedback
        onPress={onPress}
        accessibilityRole="link"
        accessibilityLabel={action}
        hitSlop={12}
        className="rounded-md"
      >
        <Typography type={textRole.supporting.type} weight="bold" className="text-brand-text">
          {action}
        </Typography>
      </PressableFeedback>
    </View>
  );
}
