import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Button, PressableFeedback, SearchField, Typography } from "heroui-native";
import { type JSX, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandWordmark } from "@/components/shared/brand-wordmark";
import type { IconName } from "@/components/ui/icon-tile";
import { iconSize, layout, spacing, textRole, useBrandColor } from "@/design-system";
import { useSession } from "@/features/auth/session";
import type { Hospital, HospitalMembership } from "@/features/hospitals/hospital";
import { membershipKey } from "@/features/hospitals/hospital";
import { useHospitalContext } from "@/features/hospitals/hospital-context";

const ROLE = { staff: "Staff", doctor: "Doctor", admin: "Admin" } as const;
const ROLE_ICON: Record<HospitalMembership["role"], IconName> = {
  staff: "clipboard-account-outline",
  doctor: "doctor",
  admin: "shield-account-outline",
};

function OptionRow({
  icon,
  title,
  subtitle,
  selected,
  busy,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  selected: boolean;
  busy?: boolean;
  onPress: () => void;
}): JSX.Element {
  const vivid = useBrandColor("brand-vivid");
  return (
    <PressableFeedback
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={[title, subtitle].filter(Boolean).join(", ")}
      className="rounded-2xl"
    >
      <View
        className={`min-h-16 flex-row items-center gap-3 rounded-2xl border px-3.5 py-3 ${
          selected ? "border-brand-vivid/60 bg-brand-subtle/40" : "border-border bg-surface"
        }`}
      >
        <View className="size-10 items-center justify-center rounded-xl bg-brand-subtle">
          <MaterialCommunityIcons name={icon} size={iconSize.md} color={vivid} />
        </View>
        <View className="flex-1 gap-0.5">
          <Typography type={textRole.bodyStrong.type} weight="semibold" numberOfLines={1}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography type={textRole.supporting.type} color="muted" numberOfLines={1}>
              {subtitle}
            </Typography>
          ) : null}
        </View>
        {busy ? (
          <Typography type={textRole.caption.type} color="muted">
            Opening…
          </Typography>
        ) : selected ? (
          <MaterialCommunityIcons name="check-circle" size={iconSize.md} color={vivid} />
        ) : (
          <MaterialCommunityIcons name="chevron-right" size={iconSize.md} color={vivid} />
        )}
      </View>
    </PressableFeedback>
  );
}

/** Full-screen frame for the pickers shown before entering a workspace. */
function PickerFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: JSX.Element;
}): JSX.Element {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      className="flex-1 bg-background"
      keyboardShouldPersistTaps="handled"
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
          {title}
        </Typography>
        <Typography type={textRole.supporting.type} color="muted">
          {subtitle}
        </Typography>
      </View>
      {children}
    </ScrollView>
  );
}

/**
 * Patient + every active membership. Switching never changes roles; it
 * only picks which context the app uses. Rebuilds the app's screens, so
 * nothing from the previous workspace stays visible.
 */
export function WorkspacePicker(): JSX.Element {
  const { signOut } = useSession();
  const {
    memberships,
    hospitals,
    patientHospital,
    chooseWorkspace,
    choosePatientMode,
    cancelSwitch,
  } = useHospitalContext();
  const hospitalName = (id: string): string => hospitals.find((h) => h.id === id)?.name ?? id;

  return (
    <PickerFrame
      title={cancelSwitch ? "Switch workspace" : "Choose a workspace"}
      subtitle="One account, several roles. You can switch any time from Profile or Settings."
    >
      <View className="gap-4">
        <View className="gap-2" accessibilityRole="radiogroup">
          <OptionRow
            icon="account-heart-outline"
            title="Patient"
            subtitle={
              patientHospital
                ? `Book and track care · ${patientHospital.name}`
                : "Book and track your own care"
            }
            selected={false}
            onPress={choosePatientMode}
          />
          {memberships.map((membership) => (
            <OptionRow
              key={membershipKey(membership)}
              icon={ROLE_ICON[membership.role]}
              title={`${ROLE[membership.role]} · ${hospitalName(membership.hospitalId)}`}
              {...(membership.role === "admin" ? { subtitle: "Queues plus hospital admin" } : {})}
              selected={false}
              onPress={() => chooseWorkspace(membership)}
            />
          ))}
        </View>
        <View className="flex-row justify-center gap-2">
          {cancelSwitch ? (
            <Button variant="ghost" onPress={cancelSwitch}>
              <Button.Label className="text-brand-text">Cancel</Button.Label>
            </Button>
          ) : null}
          <Button variant="ghost" onPress={() => void signOut().catch(() => undefined)}>
            <Button.Label className="text-muted">Log out</Button.Label>
          </Button>
        </View>
      </View>
    </PickerFrame>
  );
}

/** Searchable list of active hospitals with Recent first and the current one ticked. */
export function HospitalList({ onChosen }: { onChosen?: () => void }): JSX.Element {
  const { hospitals, patientHospital, recentHospitalIds, choosePatientHospital } =
    useHospitalContext();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const needle = query.trim().toLowerCase();
  const matches = (h: Hospital): boolean =>
    !needle || [h.name, h.shortName, h.location].some((v) => v?.toLowerCase().includes(needle));
  const recent = recentHospitalIds
    .map((id) => hospitals.find((h) => h.id === id))
    .filter((h): h is Hospital => !!h && matches(h));
  const others = hospitals.filter((h) => matches(h) && !recent.some((r) => r.id === h.id));

  const choose = (hospital: Hospital): void => {
    if (busy) return;
    setBusy(hospital.id);
    choosePatientHospital(hospital)
      .then(() => onChosen?.())
      .finally(() => setBusy(null));
  };
  const row = (hospital: Hospital): JSX.Element => (
    <OptionRow
      key={hospital.id}
      icon="hospital-building"
      title={hospital.name}
      {...(hospital.location || hospital.shortName
        ? { subtitle: hospital.location ?? hospital.shortName }
        : {})}
      selected={patientHospital?.id === hospital.id}
      busy={busy === hospital.id}
      onPress={() => choose(hospital)}
    />
  );

  return (
    <View className="gap-4">
      {hospitals.length > 1 ? (
        <SearchField value={query} onChange={setQuery}>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input
              placeholder="Search hospitals"
              accessibilityLabel="Search hospitals"
              className="h-12 rounded-full border border-border bg-surface-secondary"
            />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      ) : null}
      {recent.length > 0 ? (
        <View className="gap-2">
          <Typography
            type={textRole.supporting.type}
            weight="semibold"
            color="muted"
            className="px-1"
          >
            Recent
          </Typography>
          {recent.map(row)}
        </View>
      ) : null}
      {others.length > 0 ? (
        <View className="gap-2">
          {recent.length > 0 ? (
            <Typography
              type={textRole.supporting.type}
              weight="semibold"
              color="muted"
              className="px-1"
            >
              All hospitals
            </Typography>
          ) : null}
          {others.map(row)}
        </View>
      ) : null}
      {recent.length + others.length === 0 ? (
        <Typography type={textRole.supporting.type} color="muted" align="center" className="py-6">
          No hospitals match “{query.trim()}”.
        </Typography>
      ) : null}
    </View>
  );
}

/** First-time hospital choice in Patient mode (several hospitals, none chosen yet). */
export function HospitalPickerGate(): JSX.Element {
  const { signOut } = useSession();
  const { memberships, switchWorkspace } = useHospitalContext();
  return (
    <PickerFrame
      title="Choose your hospital"
      subtitle="Services, doctors, booking and queues follow this hospital. Your appointments everywhere stay in My Appointments."
    >
      <View className="gap-4">
        <HospitalList />
        <View className="flex-row justify-center gap-2">
          {memberships.length > 0 ? (
            <Button variant="ghost" onPress={switchWorkspace}>
              <Button.Label className="text-brand-text">Switch workspace</Button.Label>
            </Button>
          ) : null}
          <Button variant="ghost" onPress={() => void signOut().catch(() => undefined)}>
            <Button.Label className="text-muted">Log out</Button.Label>
          </Button>
        </View>
      </View>
    </PickerFrame>
  );
}
