import { useRouter } from "expo-router";
import { PressableFeedback, Typography } from "heroui-native";
import { type JSX, useRef, useState } from "react";
import { Alert, type TextInput, View } from "react-native";

import { AuthScreen, AuthSwitch } from "@/components/shared/auth-screen";
import { FormField } from "@/components/ui/form-field";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { textRole } from "@/design-system";
import { authErrorMessage } from "@/features/auth/auth-service";
import { useSession } from "@/features/auth/session";
import { useAuthForm } from "@/features/auth/use-auth-form";
import { validateEmail, validatePasswordPresent } from "@/features/auth/validation";

export default function LoginRoute(): JSX.Element {
  const router = useRouter();
  const { signIn } = useSession();
  const passwordRef = useRef<TextInput>(null);
  const [pending, setPending] = useState(false);
  const form = useAuthForm({
    email: ({ email }) => validateEmail(email),
    password: ({ password }) => validatePasswordPresent(password),
  });

  const submit = async (): Promise<void> => {
    if (pending || !form.validateAll()) return;
    setPending(true);
    try {
      // The route guard moves to the patient area once the session has a user.
      await signIn({ email: form.values.email.trim(), password: form.values.password });
    } catch (error) {
      setPending(false);
      Alert.alert("Couldn't sign in", authErrorMessage(error));
    }
  };

  const toRegister = (): void => router.replace("/register");

  return (
    <AuthScreen
      title="Welcome back"
      subtitle="Sign in to manage your appointments and follow your queue."
    >
      <SegmentedTabs
        segments={[
          { id: "login", label: "Sign In" },
          { id: "register", label: "Register" },
        ]}
        selected="login"
        onSelect={(id) => {
          if (id === "register") toRegister();
        }}
      />

      <FormField
        label="Email"
        icon="email-outline"
        placeholder="you@example.com"
        value={form.values.email}
        onChangeText={(value) => form.setValue("email", value)}
        onBlur={() => form.blur("email")}
        error={form.errorOf("email")}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="username"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />

      <View className="gap-2">
        <FormField
          ref={passwordRef}
          label="Password"
          icon="lock-outline"
          isPassword
          placeholder="Enter your password"
          value={form.values.password}
          onChangeText={(value) => form.setValue("password", value)}
          onBlur={() => form.blur("password")}
          error={form.errorOf("password")}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
        />
        <PressableFeedback
          onPress={() =>
            router.push({
              pathname: "/forgot-password",
              params: { email: form.values.email.trim() },
            })
          }
          accessibilityRole="button"
          hitSlop={12}
          className="self-end rounded-md"
        >
          <Typography type={textRole.supporting.type} weight="semibold" className="text-brand-text">
            Forgot password?
          </Typography>
        </PressableFeedback>
      </View>

      <PrimaryButton
        label={pending ? "Signing in…" : "Sign In"}
        onPress={() => void submit()}
        accessibilityHint="Opens your AfyaQueue home"
      />

      <AuthSwitch prompt="Don't have an account?" action="Register" onPress={toRegister} />
    </AuthScreen>
  );
}
