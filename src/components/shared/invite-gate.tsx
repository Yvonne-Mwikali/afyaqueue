import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Button, Typography } from "heroui-native";
import { type JSX, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandWordmark } from "@/components/shared/brand-wordmark";
import { PrimaryButton } from "@/components/ui/primary-button";
import { iconSize, layout, spacing, textRole, useBrandColor } from "@/design-system";
import { authErrorMessage } from "@/features/auth/auth-service";
import { useSession } from "@/features/auth/session";
import type { HospitalInvite } from "@/features/hospitals/hospital";
import { useHospitalContext } from "@/features/hospitals/hospital-context";
import { errorMessage } from "@/lib/app-error";

const ROLE = { staff: "Staff", doctor: "Doctor", admin: "Admin" } as const;

/**
 * Shown after sign-in when an admin has invited this email. Accepting needs
 * a verified email (Firebase sends the link), so an invited address can't be
 * taken over by whoever registers it first.
 */
export function InviteGate(): JSX.Element {
  const insets = useSafeAreaInsets();
  const vivid = useBrandColor("brand-vivid");
  const { user, sendEmailVerification, refreshUser, signOut } = useSession();
  const { invites, hospitals, acceptInvite, dismissInvites } = useHospitalContext();
  const [busy, setBusy] = useState<string | null>(null);
  const verified = user?.emailVerified === true;
  const hospitalName = (id: string): string =>
    hospitals.find((h) => h.id === id)?.name ?? "A hospital";

  const run = async (key: string, work: () => Promise<void>, failTitle: string): Promise<void> => {
    if (busy) return;
    setBusy(key);
    try {
      await work();
    } catch (error) {
      Alert.alert(
        failTitle,
        key === "verify" || key === "send" ? authErrorMessage(error) : errorMessage(error)
      );
    } finally {
      setBusy(null);
    }
  };

  const accept = (invite: HospitalInvite): void =>
    void run(invite.id, () => acceptInvite(invite), "Couldn't accept the invitation");

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingTop: insets.top + spacing.lg,
        paddingBottom: insets.bottom + spacing.lg,
        paddingHorizontal: layout.screenGutter,
        gap: spacing.xl,
      }}
    >
      <BrandWordmark />
      <View className="gap-1">
        <Typography
          type={textRole.pageTitle.type}
          weight={textRole.pageTitle.weight}
          accessibilityRole="header"
        >
          You&apos;ve been invited
        </Typography>
        <Typography type={textRole.supporting.type} color="muted">
          Accept to join your hospital&apos;s AfyaQueue workspace as {user?.email}.
        </Typography>
      </View>

      {!verified ? (
        <View className="gap-3 rounded-3xl bg-linear-to-r from-hero-from to-hero-to p-4">
          <View className="flex-row items-center gap-2">
            <MaterialCommunityIcons name="email-check-outline" size={iconSize.lg} color={vivid} />
            <Typography type={textRole.itemTitle.type} weight={textRole.itemTitle.weight}>
              Verify your email first
            </Typography>
          </View>
          <Typography type={textRole.supporting.type} color="muted">
            We&apos;ll email a link to {user?.email}. Tap it, then come back and tap “I&apos;ve
            verified”.
          </Typography>
          <View className="flex-row flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              isDisabled={busy !== null}
              onPress={() =>
                void run(
                  "send",
                  async () => {
                    await sendEmailVerification();
                    Alert.alert("Link sent", `Check ${user?.email ?? "your inbox"} (and spam).`);
                  },
                  "Couldn't send the link"
                )
              }
            >
              {busy === "send" ? "Sending…" : "Send verification email"}
            </Button>
            <Button
              variant="tertiary"
              size="sm"
              isDisabled={busy !== null}
              onPress={() => void run("verify", refreshUser, "Couldn't check")}
            >
              {busy === "verify" ? "Checking…" : "I've verified"}
            </Button>
          </View>
        </View>
      ) : null}

      <View className="gap-3">
        {invites.map((invite) => (
          <View
            key={invite.id}
            className="gap-3 rounded-3xl border border-border bg-surface p-4 shadow-surface"
          >
            <View className="flex-row items-center gap-3">
              <View className="size-11 items-center justify-center rounded-2xl bg-brand-subtle">
                <MaterialCommunityIcons
                  name={invite.role === "doctor" ? "doctor" : "hospital-building"}
                  size={iconSize.lg}
                  color={vivid}
                />
              </View>
              <View className="flex-1">
                <Typography type={textRole.itemTitle.type} weight={textRole.itemTitle.weight}>
                  {hospitalName(invite.hospitalId)}
                </Typography>
                <Typography type={textRole.supporting.type} color="muted">
                  {ROLE[invite.role]}
                  {invite.role === "doctor" && invite.doctorName ? ` · ${invite.doctorName}` : ""}
                </Typography>
              </View>
            </View>
            <PrimaryButton
              label={busy === invite.id ? "Joining…" : "Accept invitation"}
              isDisabled={!verified}
              accessibilityHint={verified ? undefined : "Verify your email first"}
              onPress={() => accept(invite)}
            />
          </View>
        ))}
      </View>

      <View className="flex-row justify-center gap-2">
        <Button variant="ghost" onPress={dismissInvites}>
          <Button.Label className="text-brand-text">Not now</Button.Label>
        </Button>
        <Button variant="ghost" onPress={() => void signOut().catch(() => undefined)}>
          <Button.Label className="text-muted">Log out</Button.Label>
        </Button>
      </View>
    </ScrollView>
  );
}
