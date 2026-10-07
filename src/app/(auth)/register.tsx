import { useRouter } from "expo-router";
import { type JSX, useRef, useState } from "react";
import { Alert, type TextInput } from "react-native";

import { AuthScreen, AuthSwitch } from "@/components/shared/auth-screen";
import { FormField } from "@/components/ui/form-field";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { authErrorMessage } from "@/features/auth/auth-service";
import { useSession } from "@/features/auth/session";
import { useAuthForm } from "@/features/auth/use-auth-form";
import {
  PASSWORD_MIN_LENGTH,
  validateEmail,
  validateFullName,
  validateNewPassword,
  validatePasswordMatch,
  validatePhone,
} from "@/features/auth/validation";

export default function RegisterRoute(): JSX.Element {
  const router = useRouter();
  const { register } = useSession();
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const [pending, setPending] = useState(false);
  const form = useAuthForm({
    fullName: ({ fullName }) => validateFullName(fullName),
    phone: ({ phone }) => validatePhone(phone),
    email: ({ email }) => validateEmail(email),
    password: ({ password }) => validateNewPassword(password),
    confirm: ({ password, confirm }) => validatePasswordMatch(password, confirm),
  });
  const { values } = form;

  const submit = async (): Promise<void> => {
    if (pending || !form.validateAll()) return;
    setPending(true);
    try {
      // The route guard moves to the patient area once the session has a user.
      await register({
        fullName: values.fullName.trim(),
        phone: values.phone.trim(),
        email: values.email.trim(),
        password: values.password,
      });
    } catch (error) {
      setPending(false);
      Alert.alert("Couldn't create your account", authErrorMessage(error));
    }
  };

  const toLogin = (): void => router.replace("/login");

  return (
    <AuthScreen
      title="Create your account"
      subtitle="Book visits and follow your place in the queue."
    >
      <SegmentedTabs
        segments={[
          { id: "login", label: "Sign In" },
          { id: "register", label: "Register" },
        ]}
        selected="register"
        onSelect={(id) => {
          if (id === "login") toLogin();
        }}
      />

      <FormField
        label="Full name"
        icon="account-outline"
        placeholder="Your full name"
        value={values.fullName}
        onChangeText={(value) => form.setValue("fullName", value)}
        onBlur={() => form.blur("fullName")}
        error={form.errorOf("fullName")}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => phoneRef.current?.focus()}
      />
      <FormField
        ref={phoneRef}
        label="Phone number"
        icon="phone-outline"
        placeholder="e.g. 0712 345 678"
        value={values.phone}
        onChangeText={(value) => form.setValue("phone", value)}
        onBlur={() => form.blur("phone")}
        error={form.errorOf("phone")}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
      <FormField
        ref={emailRef}
        label="Email"
        icon="email-outline"
        placeholder="you@example.com"
        value={values.email}
        onChangeText={(value) => form.setValue("email", value)}
        onBlur={() => form.blur("email")}
        error={form.errorOf("email")}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <FormField
        ref={passwordRef}
        label="Password"
        icon="lock-outline"
        isPassword
        placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
        value={values.password}
        onChangeText={(value) => form.setValue("password", value)}
        onBlur={() => form.blur("password")}
        error={form.errorOf("password")}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        passwordRules={`minlength: ${PASSWORD_MIN_LENGTH};`}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => confirmRef.current?.focus()}
      />
      <FormField
        ref={confirmRef}
        label="Confirm password"
        icon="lock-check-outline"
        isPassword
        placeholder="Re-enter your password"
        value={values.confirm}
        onChangeText={(value) => form.setValue("confirm", value)}
        onBlur={() => form.blur("confirm")}
        error={form.errorOf("confirm")}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
      />

      <PrimaryButton
        label={pending ? "Creating account…" : "Create Account"}
        onPress={() => void submit()}
      />

      <AuthSwitch prompt="Already have an account?" action="Sign In" onPress={toLogin} />
    </AuthScreen>
  );
}
