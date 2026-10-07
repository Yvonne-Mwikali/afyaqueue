import { useRouter } from "expo-router";
import { Typography } from "heroui-native";
import type { JSX } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthSwitch } from "@/components/shared/auth-screen";
import { BrandWordmark } from "@/components/shared/brand-wordmark";
import { WelcomeIllustration } from "@/components/shared/welcome-illustration";
import { PrimaryButton } from "@/components/ui/primary-button";
import { layout, spacing, textRole } from "@/design-system";

/** First screen when signed out: identity, one promise, one action. */
export default function WelcomeRoute(): JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const display = textRole.screenTitle;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "space-between",
        paddingTop: insets.top + spacing.lg,
        paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.lg,
        paddingHorizontal: layout.screenGutter,
        gap: spacing.xl,
      }}
    >
      <BrandWordmark className="self-center" />

      <WelcomeIllustration />

      <View className="gap-3 px-2">
        <Typography
          type={display.type}
          weight={display.weight}
          align="center"
          accessibilityRole="header"
        >
          Your health journey{"\n"}
          <Typography type={display.type} weight={display.weight} className="text-brand-vivid">
            starts here
          </Typography>
        </Typography>
        <Typography type={textRole.body.type} color="muted" align="center">
          Book appointments and follow your place in the queue, all in one place.
        </Typography>
      </View>

      <View className="gap-5">
        <PrimaryButton label="Get Started" onPress={() => router.push("/register")} />
        <AuthSwitch
          prompt="Already have an account?"
          action="Sign In"
          onPress={() => router.push("/login")}
        />
      </View>
    </ScrollView>
  );
}
