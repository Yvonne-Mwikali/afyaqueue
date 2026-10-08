import { Avatar, ListGroup, Typography } from "heroui-native";
import type { JSX } from "react";
import { Alert, View } from "react-native";

import { PatientHeader } from "@/components/shared/patient-header";
import { Screen } from "@/components/ui/screen";
import { textRole } from "@/design-system";
import { authErrorMessage } from "@/features/auth/auth-service";
import { useSession } from "@/features/auth/session";
import { useDoctorIdentity } from "@/features/doctors/use-doctor-workspace";
import { useHospitalContext } from "@/features/hospitals/hospital-context";
import { initialsFrom } from "@/features/users/user-profile";

export default function DoctorProfileRoute(): JSX.Element {
  const { user, signOut } = useSession();
  const { doctor, hospitalId } = useDoctorIdentity();
  const { hospitals, switchWorkspace } = useHospitalContext();
  const name = doctor?.name ?? user?.displayName ?? "";
  const initials = initialsFrom(name.replace(/^Dr\.?\s+/, ""), user?.email ?? "");
  const hospital = hospitals.find((item) => item.id === hospitalId)?.name ?? "";

  const confirmLogout = (): void =>
    Alert.alert("Log out of AfyaQueue?", "You'll need to sign in again to see your queue.", [
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
        title="Profile"
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
            {doctor?.title ?? user?.email ?? ""}
          </Typography>
          <Typography type={textRole.caption.type} color="muted">
            Doctor{hospital ? ` · ${hospital}` : ""}
          </Typography>
        </View>
      </View>
      <ListGroup className="border border-border p-0 shadow-none">
        <ListGroup.Item onPress={switchWorkspace} accessibilityRole="button">
          <ListGroup.ItemContent>
            <ListGroup.ItemTitle>Workspace</ListGroup.ItemTitle>
            <ListGroup.ItemDescription>
              Doctor{hospital ? ` · ${hospital}` : ""} · Switch to Patient or another hospital
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
