import { useLocalSearchParams, useRouter } from "expo-router";
import { Typography } from "heroui-native";
import { type JSX, useState } from "react";
import { View } from "react-native";

import { AuthScreen } from "@/components/shared/auth-screen";
import { FormField } from "@/components/ui/form-field";
import { PrimaryButton } from "@/components/ui/primary-button";
import { textRole } from "@/design-system";
import { authErrorMessage } from "@/features/auth/auth-service";
import { useSession } from "@/features/auth/session";
import { useAuthForm } from "@/features/auth/use-auth-form";
import { validateEmail } from "@/features/auth/validation";

export default function ForgotPasswordRoute(): JSX.Element {
  const router = useRouter();
  const { email: initialEmail } = useLocalSearchParams<{ email?: string }>();
  const { sendPasswordReset } = useSession();
  const [phase, setPhase] = useState<"form" | "sending" | "sent">("form");
  const [error, setError] = useState<string | null>(null);
  // Starts from the email typed on Sign In.
  const form = useAuthForm(
    { email: ({ email }) => validateEmail(email) },
    { email: initialEmail ?? "" }
  );
  const email = form.values.email;

  const backToSignIn = (): void => {
    if (router.canGoBack()) router.back();
    else router.replace("/login");
  };

  const submit = async (): Promise<void> => {
    if (phase === "sending") return;
    if (!form.validateAll()) return;
    setError(null);
    setPhase("sending");
    try {
      await sendPasswordReset(email.trim());
      setPhase("sent");
    } catch (failure) {
      setPhase("form");
      setError(authErrorMessage(failure));
    }
  };

  if (phase === "sent") {
    return (
      <AuthScreen
        title="Check your email"
        subtitle="Follow the link in the email to choose a new password."
      >
        <Typography.Paragraph accessibilityLiveRegion="polite">
          If an account exists for {email.trim()}, we&apos;ve sent password reset instructions.
        </Typography.Paragraph>
        <Typography.Paragraph type={textRole.supporting.type} color="muted">
          It can take a few minutes to arrive. Check your spam folder too.
        </Typography.Paragraph>
        <PrimaryButton label="Back to Sign In" onPress={backToSignIn} />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title="Reset your password"
      subtitle="Enter the email you use for AfyaQueue and we'll send you a reset link."
    >
      <FormField
        label="Email"
        icon="email-outline"
        placeholder="you@example.com"
        value={email}
        onChangeText={(value) => {
          setError(null);
          form.setValue("email", value);
        }}
        onBlur={() => form.blur("email")}
        error={form.errorOf("email")}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={() => void submit()}
      />

      {error ? (
        <View accessibilityLiveRegion="polite">
          <Typography.Paragraph type={textRole.supporting.type} className="text-danger">
            {error}
          </Typography.Paragraph>
        </View>
      ) : null}

      <PrimaryButton
        label={phase === "sending" ? "Sending…" : "Send reset link"}
        onPress={() => void submit()}
      />
    </AuthScreen>
  );
}
