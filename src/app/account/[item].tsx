import { useLocalSearchParams, useRouter } from "expo-router";
import { Typography } from "heroui-native";
import type { JSX } from "react";

import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";

/** Profile rows that open a screen; each is a placeholder until it is built. */
const ITEMS: Record<string, string> = {
  "personal-information": "Personal Information",
  language: "Language",
  "change-password": "Change Password",
  privacy: "Privacy",
};

export default function AccountItemRoute(): JSX.Element {
  const router = useRouter();
  const { item } = useLocalSearchParams<{ item: string }>();
  const title = ITEMS[item] ?? "Account";

  return (
    <Screen header={<ScreenHeader title={title} onBack={() => router.back()} />}>
      <Typography.Paragraph color="muted">{title} is coming soon.</Typography.Paragraph>
    </Screen>
  );
}
