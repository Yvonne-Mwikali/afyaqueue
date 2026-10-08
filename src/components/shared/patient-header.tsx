import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Avatar, PressableFeedback, Typography, useThemeColor } from "heroui-native";
import type { JSX } from "react";
import { View } from "react-native";

import { BrandWordmark } from "@/components/shared/brand-wordmark";
import { type TextRole, textRole } from "@/design-system";
import { useNotifications } from "@/features/notifications/notifications-context";

type PatientHeaderProps = {
  title: string;
  subtitle?: string;
  initials: string;
  onPressProfile: () => void;
  /** "greeting" (Home, 22) or "screen" (tab screens such as Services, 24). */
  titleVariant?: "greeting" | "screen";
};

/**
 * Brand row (logo, notifications, profile) followed by the screen title.
 * Shared by patient tab screens.
 */
export function PatientHeader({
  title,
  subtitle,
  initials,
  onPressProfile,
  titleVariant = "greeting",
}: PatientHeaderProps): JSX.Element {
  const foreground = useThemeColor("foreground");
  const router = useRouter();
  const { unreadCount } = useNotifications();
  const badge = unreadCount > 9 ? "9+" : String(unreadCount);
  const titleRole: TextRole = titleVariant === "screen" ? textRole.pageTitle : textRole.cardTitle;

  return (
    <View className={titleVariant === "screen" ? "gap-1" : "gap-2"}>
      <View className="flex-row items-center">
        <BrandWordmark className="flex-1" />
        <PressableFeedback
          onPress={() => router.navigate("/notifications")}
          accessibilityRole="button"
          accessibilityLabel={
            unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
          }
          className="size-12 items-center justify-center rounded-full"
        >
          <MaterialCommunityIcons name="bell-outline" size={26} color={foreground} />
          {unreadCount > 0 ? (
            <View className="absolute right-1 top-1 min-w-5 items-center rounded-full bg-accent px-1">
              <Typography
                type={textRole.micro.type}
                weight="bold"
                className="text-accent-foreground"
              >
                {badge}
              </Typography>
            </View>
          ) : null}
        </PressableFeedback>
        <PressableFeedback
          onPress={onPressProfile}
          accessibilityRole="button"
          accessibilityLabel="Your profile"
          hitSlop={4}
          className="ml-2 rounded-full"
        >
          {/* Avatar slot: 40dp with a peach ring; initials until a photo exists. */}
          <Avatar
            size="sm"
            variant="soft"
            color="accent"
            alt=""
            className="border-2 border-brand-subtle"
          >
            <Avatar.Fallback>{initials}</Avatar.Fallback>
          </Avatar>
        </PressableFeedback>
      </View>
      <View>
        <Typography
          type={titleRole.type}
          weight={titleRole.weight}
          accessibilityRole="header"
          className={titleRole.className}
        >
          {title}
        </Typography>
        {subtitle ? (
          <Typography.Paragraph color="muted" className="leading-6">
            {subtitle}
          </Typography.Paragraph>
        ) : null}
      </View>
    </View>
  );
}
