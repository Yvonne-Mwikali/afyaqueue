import { useRouter } from "expo-router";
import { Avatar, Button, ListGroup, Switch, Typography } from "heroui-native";
import { type JSX, type ReactNode, useState } from "react";
import { Alert, View } from "react-native";

import { LoadingState } from "@/components/feedback/loading-state";
import { AppearanceSheet } from "@/components/shared/appearance-sheet";
import { PatientHeader } from "@/components/shared/patient-header";
import { Screen } from "@/components/ui/screen";
import { textRole } from "@/design-system";
import { authErrorMessage } from "@/features/auth/auth-service";
import { useSession } from "@/features/auth/session";
import { useHospitalContext } from "@/features/hospitals/hospital-context";
import { useNotificationPreferences } from "@/features/preferences/notification-preferences";
import { THEME_OPTIONS, useThemePreference } from "@/features/preferences/theme-preference";
import { useUserProfile } from "@/features/users/use-user-profile";
import { initialsFrom } from "@/features/users/user-profile";
import {
  ensureNotificationPermission,
  nativeNotificationsAvailable,
} from "@/lib/local-notifications";
import { formatLongDate } from "@/utils/date-format";

type AccountItem = "personal-information" | "language" | "change-password" | "privacy";

export default function PatientProfileRoute(): JSX.Element {
  const router = useRouter();
  const { user, signOut } = useSession();
  const { status, profile, retry } = useUserProfile();
  const { patientHospital, hospitals, memberships, switchWorkspace } = useHospitalContext();
  // Only real details: the profile, else what the signed-in account itself knows.
  const name = profile?.fullName || user?.displayName || "";
  const email = profile?.email || user?.email || "";
  const initials = initialsFrom(name, email);
  const [alerts, setAlerts] = useNotificationPreferences();
  const [theme, setTheme] = useThemePreference();
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const themeLabel = THEME_OPTIONS.find((option) => option.id === theme)?.label ?? "System";
  const open = (item: AccountItem): void =>
    router.push({ pathname: "/account/[item]", params: { item } });

  const confirmLogout = (): void =>
    Alert.alert("Log out of AfyaQueue?", "You'll need to sign in again to book or check in.", [
      { text: "Stay signed in", style: "cancel" },
      // Clearing the session returns to Welcome through the route guard.
      {
        text: "Log out",
        style: "destructive",
        onPress: () =>
          void signOut().catch((error: unknown) =>
            Alert.alert("Couldn't log out", authErrorMessage(error))
          ),
      },
    ]);

  return (
    <>
      <Screen>
        <PatientHeader
          title="Profile"
          titleVariant="screen"
          initials={initials}
          onPressProfile={() => undefined}
        />

        {status === "loading" ? (
          <LoadingState title="Loading your profile" />
        ) : (
          <>
            {/* Compact summary. */}
            <View className="flex-row items-center gap-3">
              <Avatar size="lg" variant="soft" color="accent" alt="">
                <Avatar.Fallback>{initials}</Avatar.Fallback>
              </Avatar>
              <View className="flex-1">
                <Typography type={textRole.sectionTitle.type} weight={textRole.sectionTitle.weight}>
                  {name || "Your account"}
                </Typography>
                <Typography type={textRole.supporting.type} color="muted" numberOfLines={1}>
                  {email}
                </Typography>
              </View>
            </View>

            {status === "error" || status === "missing" ? (
              <View className="items-start gap-2">
                <Typography.Paragraph type={textRole.supporting.type} color="muted">
                  {status === "error"
                    ? "We couldn't load your profile details. Check your connection."
                    : "Your profile details aren't available yet."}
                </Typography.Paragraph>
                {status === "error" ? (
                  <Button variant="tertiary" size="sm" hitSlop={4} onPress={retry}>
                    <Button.Label>Try again</Button.Label>
                  </Button>
                ) : null}
              </View>
            ) : (
              <Group title="Personal Information">
                <Row title="Full name" value={name} onPress={() => open("personal-information")} />
                <Row
                  title="Phone"
                  value={profile?.phone ?? "Not added"}
                  onPress={() => open("personal-information")}
                />
                <Row title="Email" value={email} onPress={() => open("personal-information")} />
                {profile?.dateOfBirth ? (
                  <Row
                    title="Date of birth"
                    value={formatLongDate(profile.dateOfBirth)}
                    onPress={() => open("personal-information")}
                  />
                ) : null}
              </Group>
            )}
          </>
        )}

        <Group title="Preferences">
          <ToggleRow
            title="Appointment reminders"
            description="24 hours and 1 hour before"
            value={alerts.appointmentReminders}
            onChange={(on) => setAlerts({ appointmentReminders: on })}
          />
          <ToggleRow
            title="Queue alerts"
            description="When you're called, held or back in the queue"
            value={alerts.queueAlerts}
            onChange={(on) => setAlerts({ queueAlerts: on })}
          />
          <Row
            title="Hospital"
            value={patientHospital?.name ?? ""}
            // Switching only changes where you browse and book; appointments everywhere stay.
            onPress={hospitals.length > 1 ? () => router.push("/hospitals") : () => undefined}
          />
          {memberships.length > 0 ? (
            <Row title="Workspace" value="Patient" onPress={switchWorkspace} />
          ) : null}
          <Row title="Appearance" value={themeLabel} onPress={() => setAppearanceOpen(true)} />
          <Row
            title="Language"
            value={profile?.language ?? "English"}
            onPress={() => open("language")}
          />
        </Group>

        <Group title="Account">
          <Row title="Change Password" onPress={() => open("change-password")} />
          <Row title="Privacy" onPress={() => open("privacy")} />
          <ListGroup.Item onPress={confirmLogout} accessibilityRole="button">
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle className="text-danger">Log out</ListGroup.ItemTitle>
            </ListGroup.ItemContent>
          </ListGroup.Item>
        </Group>
      </Screen>

      <AppearanceSheet
        isOpen={appearanceOpen}
        onOpenChange={setAppearanceOpen}
        selected={theme}
        onSelect={setTheme}
      />
    </>
  );
}

/** Section label and a quiet grouped list (hairline outline, no shadow). */
function Group({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <View className="gap-2">
      <Typography
        type={textRole.supporting.type}
        weight="semibold"
        color="muted"
        accessibilityRole="header"
        className="px-1"
      >
        {title}
      </Typography>
      <ListGroup className="border border-border p-0 shadow-none">{children}</ListGroup>
    </View>
  );
}

/** Title on the left, current value muted on the right, default chevron. */
function Row({
  title,
  value,
  onPress,
}: {
  title: string;
  value?: string;
  onPress: () => void;
}): JSX.Element {
  return (
    <ListGroup.Item
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={value ? `${title}, ${value}` : title}
    >
      <ListGroup.ItemContent>
        <ListGroup.ItemTitle>{title}</ListGroup.ItemTitle>
      </ListGroup.ItemContent>
      {value ? (
        <Typography
          type={textRole.supporting.type}
          color="muted"
          numberOfLines={1}
          className="max-w-1/2 shrink"
        >
          {value}
        </Typography>
      ) : null}
      <ListGroup.ItemSuffix />
    </ListGroup.Item>
  );
}

/**
 * A phone-alert switch. Turning one on asks for permission; if the phone
 * refuses, say where to change it (the in-app center keeps working).
 */
function ToggleRow({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: (on: boolean) => void;
}): JSX.Element {
  const toggle = (on: boolean): void => {
    onChange(on);
    if (!on) return;
    if (!nativeNotificationsAvailable) {
      // Expo Go on Android: the choice is saved for builds that support alerts.
      if (__DEV__) {
        Alert.alert(
          "Phone alerts unavailable here",
          "Expo Go on Android can't show device notifications. You'll still see everything under the bell."
        );
      }
      return;
    }
    void ensureNotificationPermission().then((granted) => {
      if (!granted) {
        Alert.alert(
          "Notifications are off",
          "Allow notifications for this app in your phone's settings to get alerts. You'll still see everything under the bell."
        );
      }
    });
  };
  return (
    <ListGroup.Item
      onPress={() => toggle(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={title}
    >
      <ListGroup.ItemContent>
        <ListGroup.ItemTitle>{title}</ListGroup.ItemTitle>
        <ListGroup.ItemDescription>{description}</ListGroup.ItemDescription>
      </ListGroup.ItemContent>
      <ListGroup.ItemSuffix>
        <Switch isSelected={value} onSelectedChange={toggle} />
      </ListGroup.ItemSuffix>
    </ListGroup.Item>
  );
}
