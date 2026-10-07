import { useRouter } from "expo-router";
import { Button, Switch, Typography } from "heroui-native";
import { type JSX, useState } from "react";
import { View } from "react-native";

import { AdminSection } from "@/components/admin/admin-ui";
import { FormField } from "@/components/ui/form-field";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { textRole } from "@/design-system";
import { SCHEDULE_TEMPLATES } from "@/features/admin/admin";
import {
  useAdminActions,
  useAdminHospital,
  useAdminInvites,
  useAdminServices,
} from "@/features/admin/use-admin";
import { errorMessage } from "@/lib/app-error";

/**
 * Add a doctor without needing their account: the record, services and
 * weekly hours are saved together, so they're bookable straight away when
 * active. An invitation email is optional and can be sent later.
 */
export default function AdminNewDoctorRoute(): JSX.Element {
  const router = useRouter();
  const { repo, hospitalId } = useAdminActions();
  const hospital = useAdminHospital();
  const services = useAdminServices();
  const invites = useAdminInvites();
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [facility, setFacility] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [template, setTemplate] = useState("weekdays");
  const [email, setEmail] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleService = (id: string): void =>
    setServiceIds((list) => (list.includes(id) ? list.filter((s) => s !== id) : [...list, id]));

  const save = (): void => {
    if (saving || !hospitalId) return;
    if (!name.trim() || !specialty.trim()) {
      setError("Enter the doctor's name and specialty.");
      return;
    }
    setSaving(true);
    setError(null);
    repo
      .createDoctor(
        hospitalId,
        {
          name: name.trim(),
          specialty: specialty.trim(),
          hospital: facility.trim() || hospital.data?.name || "",
          active,
          serviceIds,
          windows: SCHEDULE_TEMPLATES.find((t) => t.id === template)?.windows ?? [],
          inviteEmail: email,
        },
        invites.data
      )
      .then((doctorId) =>
        router.replace({ pathname: "/admin/doctors/[doctorId]", params: { doctorId } })
      )
      .catch((failure: unknown) => setError(errorMessage(failure)))
      .finally(() => setSaving(false));
  };

  return (
    <Screen
      header={<ScreenHeader title="Add doctor" onBack={() => router.back()} />}
      footer={<PrimaryButton label={saving ? "Saving…" : "Save doctor"} onPress={save} />}
    >
      <AdminSection title="Doctor">
        <FormField
          label="Full name"
          icon="account-outline"
          value={name}
          onChangeText={setName}
          placeholder="Dr. Jane Wanjiku"
          autoCapitalize="words"
        />
        <FormField
          label="Specialty"
          icon="stethoscope"
          value={specialty}
          onChangeText={setSpecialty}
          placeholder="Consultant Oncologist"
        />
        <FormField
          label="Facility / clinic"
          icon="hospital-building"
          value={facility}
          onChangeText={setFacility}
          placeholder={hospital.data?.name ?? "Shown on appointment cards"}
        />
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Typography type={textRole.bodyStrong.type} weight="semibold">
              Active
            </Typography>
            <Typography type={textRole.caption.type} color="muted">
              Bookable once they have services and hours
            </Typography>
          </View>
          <Switch isSelected={active} onSelectedChange={setActive} />
        </View>
      </AdminSection>

      <AdminSection title="Services">
        {services.data.filter((s) => s.active).length === 0 ? (
          <Typography type={textRole.supporting.type} color="muted">
            No active services yet. Add services first, or assign later.
          </Typography>
        ) : (
          <View className="flex-row flex-wrap gap-2">
            {services.data
              .filter((s) => s.active)
              .map((service) => (
                <Button
                  key={service.id}
                  size="sm"
                  variant={serviceIds.includes(service.id) ? "primary" : "secondary"}
                  onPress={() => toggleService(service.id)}
                  accessibilityState={{ selected: serviceIds.includes(service.id) }}
                >
                  {service.name}
                </Button>
              ))}
          </View>
        )}
      </AdminSection>

      <AdminSection title="Weekly availability">
        <View className="gap-2">
          {SCHEDULE_TEMPLATES.map((option) => (
            <Button
              key={option.id}
              variant={template === option.id ? "primary" : "secondary"}
              onPress={() => setTemplate(option.id)}
              accessibilityState={{ selected: template === option.id }}
            >
              {option.label}
            </Button>
          ))}
        </View>
        <Typography type={textRole.caption.type} color="muted">
          You can fine-tune hours per day after saving.
        </Typography>
      </AdminSection>

      <AdminSection title="Login (optional)">
        <FormField
          label="Doctor's email"
          icon="email-outline"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Invite later if you prefer"
        />
        <Typography type={textRole.caption.type} color="muted">
          We&apos;ll create an invitation. When they sign in with this email (and verify it), the
          doctor workspace opens for them.
        </Typography>
      </AdminSection>

      {error ? (
        <Typography type={textRole.supporting.type} className="text-danger">
          {error}
        </Typography>
      ) : null}
    </Screen>
  );
}
