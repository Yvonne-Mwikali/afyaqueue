import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Avatar, ListGroup, Typography } from "heroui-native";
import type { JSX } from "react";
import { Alert, View } from "react-native";

import { PatientHeader } from "@/components/shared/patient-header";
import { Screen } from "@/components/ui/screen";
import { iconSize, textRole, useBrandColor } from "@/design-system";
import { authErrorMessage } from "@/features/auth/auth-service";
import { useSession } from "@/features/auth/session";
import { useHospitalContext } from "@/features/hospitals/hospital-context";
import { useUserProfile } from "@/features/users/use-user-profile";
import { initialsFrom } from "@/features/users/user-profile";

export default function StaffSettingsRoute(): JSX.Element {
  const router = useRouter();
  const vivid = useBrandColor("brand-vivid");
  const { user, signOut } = useSession();
  const { profile } = useUserProfile();
  const name = profile?.fullName || user?.displayName || "";
  const email = profile?.email || user?.email || "";
  const initials = initialsFrom(name, email);
  const { workspace, hospitals, switchWorkspace } = useHospitalContext();
  const role = workspace?.role === "admin" ? "Admin" : "Staff";
  const hospital = hospitals.find((item) => item.id === workspace?.hospitalId)?.name ?? "";

  const confirmLogout = (): void =>
    Alert.alert("Log out of AfyaQueue?", "You'll need to sign in again to manage queues.", [
      { text: "Stay signed in", style: "cancel" },
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
    <Screen>
      <PatientHeader
        title="Settings"
        titleVariant="screen"
        initials={initials}
        onPressProfile={() => undefined}
      />
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
          <Typography type={textRole.caption.type} color="muted">
            {role}
            {hospital ? ` · ${hospital}` : ""}
          </Typography>
        </View>
      </View>
      <ListGroup className="border border-border p-0 shadow-none">
        {workspace?.role === "admin" ? (
          <ListGroup.Item onPress={() => router.push("/admin")} accessibilityRole="button">
            <ListGroup.ItemPrefix>
              <View className="size-10 items-center justify-center rounded-xl bg-brand-subtle">
                <MaterialCommunityIcons
                  name="shield-account-outline"
                  size={iconSize.md}
                  color={vivid}
                />
              </View>
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>Hospital Admin</ListGroup.ItemTitle>
              <ListGroup.ItemDescription>
                Team, doctors, services, schedules and audit
              </ListGroup.ItemDescription>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix />
          </ListGroup.Item>
        ) : null}
        <ListGroup.Item onPress={switchWorkspace} accessibilityRole="button">
          <ListGroup.ItemContent>
            <ListGroup.ItemTitle>Workspace</ListGroup.ItemTitle>
            <ListGroup.ItemDescription>
              {role}
              {hospital ? ` · ${hospital}` : ""} · Switch to Patient or another hospital
            </ListGroup.ItemDescription>
          </ListGroup.ItemContent>
          <ListGroup.ItemSuffix />
        </ListGroup.Item>
        <ListGroup.Item onPress={confirmLogout} accessibilityRole="button">
          <ListGroup.ItemContent>
            <ListGroup.ItemTitle className="text-danger">Log out</ListGroup.ItemTitle>
          </ListGroup.ItemContent>
        </ListGroup.Item>
      </ListGroup>
    </Screen>
  );
}
