import { useRouter } from "expo-router";
import { Typography } from "heroui-native";
import { type JSX, useState } from "react";
import { Alert } from "react-native";

import { AdminSection } from "@/components/admin/admin-ui";
import { LoadingState } from "@/components/feedback/loading-state";
import { FormField } from "@/components/ui/form-field";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { textRole } from "@/design-system";
import type { AdminHospital } from "@/features/admin/admin";
import { useAdminActions, useAdminHospital } from "@/features/admin/use-admin";
import { errorMessage } from "@/lib/app-error";

/** Name, short name, location and time zone. The id and active status aren't editable here. */
export default function AdminHospitalRoute(): JSX.Element {
  const router = useRouter();
  const hospital = useAdminHospital();
  const header = <ScreenHeader title="Hospital" onBack={() => router.back()} />;
  if (!hospital.data) {
    return (
      <Screen header={header}>
        {hospital.status === "error" ? (
          <Typography.Paragraph color="muted">
            We couldn&apos;t load the hospital.
          </Typography.Paragraph>
        ) : (
          <LoadingState title="Loading hospital" />
        )}
      </Screen>
    );
  }
  return <HospitalForm key={hospital.data.id} hospital={hospital.data} header={header} />;
}

function HospitalForm({
  hospital,
  header,
}: {
  hospital: AdminHospital;
  header: JSX.Element;
}): JSX.Element {
  const { repo } = useAdminActions();
  const [form, setForm] = useState({
    name: hospital.name,
    shortName: hospital.shortName,
    location: hospital.location,
    timeZone: hospital.timeZone,
  });
  const [saving, setSaving] = useState(false);

  const save = (): void => {
    if (saving) return;
    if (!form.name.trim()) {
      Alert.alert("Missing name", "The hospital needs a name.");
      return;
    }
    if (!/^[A-Za-z_]+\/[A-Za-z_]+/.test(form.timeZone.trim())) {
      Alert.alert("Check the time zone", "Use an IANA time zone such as Africa/Nairobi.");
      return;
    }
    setSaving(true);
    repo
      .updateHospital(hospital.id, {
        name: form.name.trim(),
        shortName: form.shortName.trim(),
        location: form.location.trim(),
        timeZone: form.timeZone.trim(),
      })
      .then(() => Alert.alert("Saved", "Hospital details updated."))
      .catch((error: unknown) => Alert.alert("Couldn't save", errorMessage(error)))
      .finally(() => setSaving(false));
  };

  return (
    <Screen
      header={header}
      footer={<PrimaryButton label={saving ? "Saving…" : "Save"} onPress={save} />}
    >
      <AdminSection title="Details">
        <FormField
          label="Name"
          icon="hospital-building"
          value={form.name}
          onChangeText={(name) => setForm({ ...form, name })}
        />
        <FormField
          label="Short name"
          icon="tag-outline"
          value={form.shortName}
          onChangeText={(shortName) => setForm({ ...form, shortName })}
        />
        <FormField
          label="Location"
          icon="map-marker-outline"
          value={form.location}
          onChangeText={(location) => setForm({ ...form, location })}
          placeholder="e.g. Ngong Road, Nairobi"
        />
        <FormField
          label="Time zone"
          icon="clock-outline"
          value={form.timeZone}
          onChangeText={(timeZone) => setForm({ ...form, timeZone })}
          autoCapitalize="none"
          placeholder="Africa/Nairobi"
        />
      </AdminSection>
      <Typography type={textRole.caption.type} color="muted">
        Hospital id: {hospital.id} (can&apos;t be changed). Doctor hours use this time zone.
        Deactivating a hospital is done by AfyaQueue support, not from the app.
      </Typography>
    </Screen>
  );
}
