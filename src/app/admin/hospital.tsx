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
import {
  cleanContact,
  contactProblems,
  type HospitalContact,
} from "@/features/hospitals/hospital-contact";
import { useAdminActions, useAdminHospital } from "@/features/admin/use-admin";
import { errorMessage } from "@/lib/app-error";

/**
 * Name, location, time zone and the contact details patients see on
 * Contact. The id and active status aren't editable here.
 */
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
  const [contact, setContact] = useState<HospitalContact>({
    phone: hospital.phone,
    supportPhone: hospital.supportPhone,
    emergencyPhone: hospital.emergencyPhone,
    email: hospital.email,
  });
  const [showProblems, setShowProblems] = useState(false);
  const problems = contactProblems(cleanContact(contact));
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
    if (Object.keys(problems).length > 0) {
      setShowProblems(true);
      return;
    }
    setSaving(true);
    repo
      .updateHospital(hospital.id, {
        name: form.name.trim(),
        shortName: form.shortName.trim(),
        location: form.location.trim(),
        timeZone: form.timeZone.trim(),
        ...cleanContact(contact),
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
      <AdminSection title="Contact">
        <Typography type={textRole.supporting.type} color="muted">
          Patients see these on Contact. Leave a field empty to hide it.
        </Typography>
        <FormField
          label="Main phone"
          icon="phone-outline"
          value={contact.phone}
          onChangeText={(phone) => setContact({ ...contact, phone })}
          keyboardType="phone-pad"
          placeholder="e.g. +254 20 123 4567"
          {...(showProblems && problems.phone ? { error: problems.phone } : {})}
        />
        <FormField
          label="Support phone"
          icon="headset"
          value={contact.supportPhone}
          onChangeText={(supportPhone) => setContact({ ...contact, supportPhone })}
          keyboardType="phone-pad"
          {...(showProblems && problems.supportPhone ? { error: problems.supportPhone } : {})}
        />
        <FormField
          label="Emergency phone (optional)"
          icon="ambulance"
          value={contact.emergencyPhone}
          onChangeText={(emergencyPhone) => setContact({ ...contact, emergencyPhone })}
          keyboardType="phone-pad"
          {...(showProblems && problems.emergencyPhone ? { error: problems.emergencyPhone } : {})}
        />
        <FormField
          label="Email"
          icon="email-outline"
          value={contact.email}
          onChangeText={(email) => setContact({ ...contact, email })}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="e.g. reception@hospital.org"
          {...(showProblems && problems.email ? { error: problems.email } : {})}
        />
      </AdminSection>
      <Typography type={textRole.caption.type} color="muted">
        Hospital id: {hospital.id} (can&apos;t be changed). Doctor hours use this time zone.
        Deactivating a hospital is done by AfyaQueue support, not from the app.
      </Typography>
    </Screen>
  );
}
