import { Button, Typography } from "heroui-native";
import { type JSX, useEffect, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LoadingState } from "@/components/feedback/loading-state";
import { BrandWordmark } from "@/components/shared/brand-wordmark";
import { layout, spacing } from "@/design-system";

/** How long a missing profile counts as "still being created" (registration). */
const SETUP_GRACE_MS = 8000;

type AccountGateProps = {
  /** pending = profile loading or just being created; others are dead ends. */
  state: "pending" | "unsupported" | "error";
  /** Overrides the default message for a dead end. */
  message?: string;
  onRetry: () => void;
  onSignOut: () => void;
};

/**
 * Shown while a signed-in user's role is unknown. Never routes on a guess:
 * a missing, unreadable or unsupported role keeps the user here with a way
 * out.
 */
export function AccountGate({
  state,
  message: custom,
  onRetry,
  onSignOut,
}: AccountGateProps): JSX.Element {
  const insets = useSafeAreaInsets();
  const [waitedLong, setWaitedLong] = useState(false);

  useEffect(() => {
    if (state !== "pending") return;
    const timer = setTimeout(() => setWaitedLong(true), SETUP_GRACE_MS);
    return () => clearTimeout(timer);
  }, [state]);

  const stuck = state !== "pending" || waitedLong;
  const message =
    custom ??
    (state === "error"
      ? "We couldn't load your account. Check your connection and try again."
      : state === "unsupported"
        ? "This account doesn't have access to the AfyaQueue app. Please contact the hospital."
        : "We couldn't find your account details yet. Try again in a moment.");

  return (
    <View
      className="flex-1 justify-center gap-6 bg-background"
      style={{
        paddingTop: insets.top + spacing.lg,
        paddingBottom: insets.bottom + spacing.lg,
        paddingHorizontal: layout.screenGutter,
      }}
    >
      <BrandWordmark className="self-center" />
      {stuck ? (
        <View className="items-center gap-4">
          <Typography.Paragraph color="muted" align="center">
            {message}
          </Typography.Paragraph>
          <View className="flex-row gap-2">
            {state !== "unsupported" ? (
              <Button variant="secondary" onPress={onRetry}>
                Try again
              </Button>
            ) : null}
            <Button variant="ghost" onPress={onSignOut}>
              <Button.Label className="text-brand-text">Log out</Button.Label>
            </Button>
          </View>
        </View>
      ) : (
        <LoadingState title="Setting up your account" />
      )}
    </View>
  );
}
