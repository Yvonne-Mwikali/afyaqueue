import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, Switch, Typography } from "heroui-native";
import { type JSX, useState } from "react";
import { Alert, View } from "react-native";

import { AdminSection, asIcon, confirmChange } from "@/components/admin/admin-ui";
import { LoadingState } from "@/components/feedback/loading-state";
import { FilterChips } from "@/components/ui/filter-chips";
import { FormField } from "@/components/ui/form-field";
import { IconTile } from "@/components/ui/icon-tile";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { textRole } from "@/design-system";
import type { AdminService } from "@/features/admin/admin";
import {
  useAdminActions,
  useAdminDoctors,
  useAdminLinks,
  useAdminServices,
} from "@/features/admin/use-admin";
import type { ServiceCategory, ServiceMode } from "@/features/services/service-catalog";
import { errorMessage } from "@/lib/app-error";

const CATEGORIES: { id: ServiceCategory; label: string }[] = [
  { id: "primary", label: "Primary care" },
  { id: "specialty", label: "Specialty" },
  { id: "diagnostic", label: "Diagnostic" },
];
/** Durations that fit slot locks (up to 45 minutes). */
const DURATIONS = ["15", "20", "30", "45"].map((d) => ({ id: d, label: `${d} min` }));
const ICONS = [
  "stethoscope",
  "tooth-outline",
  "ribbon",
  "baby-face-outline",
  "hand-back-right-outline",
  "flask-outline",
  "heart-pulse",
  "eye-outline",
  "bone",
  "brain",
  "medical-bag",
].map((id) => ({ id, label: "" }));

/** Create or edit a service; archive with Active off. */
export default function AdminServiceRoute(): JSX.Element {
  const router = useRouter();
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>();
  const services = useAdminServices();
  const service = services.data.find((s) => s.id === serviceId);
  const isNew = serviceId === "new";
  const header = (
    <ScreenHeader
      title={isNew ? "Add service" : (service?.name ?? "Service")}
      onBack={() => router.back()}
    />
  );
  if (!isNew && services.status === "loading") {
    return (
      <Screen header={header}>
        <LoadingState title="Loading service" />
      </Screen>
    );
  }
  if (!isNew && !service) {
    return (
      <Screen header={header}>
        <Typography.Paragraph color="muted">
          This service isn&apos;t in your hospital.
        </Typography.Paragraph>
      </Screen>
    );
  }
  const nextOrder = Math.max(0, ...services.data.map((s) => s.sortOrder)) + 10;
  return (
    <ServiceEditor
      key={serviceId}
      service={service ?? null}
      nextOrder={nextOrder}
      header={header}
    />
  );
}

function ServiceEditor({
  service,
  nextOrder,
  header,
}: {
  service: AdminService | null;
  nextOrder: number;
  header: JSX.Element;
}): JSX.Element {
  const router = useRouter();
  const { repo, hospitalId } = useAdminActions();
  const doctors = useAdminDoctors();
  const links = useAdminLinks();
  const [form, setForm] = useState({
    name: service?.name ?? "",
    description: service?.description ?? "",
    providerTitle: service?.providerTitle ?? "",
    category: service?.category ?? ("primary" as ServiceCategory),
    icon: service?.icon ?? "stethoscope",
    duration: String(service?.durationMinutes ?? 30),
    modes: service?.modes ?? (["in-clinic"] as ServiceMode[]),
    active: service?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]): void =>
    setForm((current) => ({ ...current, [key]: value }));
  const toggleMode = (mode: ServiceMode): void =>
    set(
      "modes",
      form.modes.includes(mode) ? form.modes.filter((m) => m !== mode) : [...form.modes, mode]
    );

  const persist = (active: boolean): Promise<string> | null => {
    if (!hospitalId) return null;
    return repo.saveService(hospitalId, service?.id ?? null, {
      name: form.name.trim(),
      description: form.description.trim(),
      providerTitle: form.providerTitle.trim(),
      category: form.category,
      icon: form.icon,
      durationMinutes: Number(form.duration),
      modes: form.modes,
      active,
      sortOrder: service?.sortOrder ?? nextOrder,
    });
  };

  const save = (): void => {
    if (saving) return;
    if (!form.name.trim() || form.modes.length === 0) {
      Alert.alert("Missing details", "Enter a name and pick at least one visit type.");
      return;
    }
    setSaving(true);
    persist(form.active)
      ?.then((id) => {
        if (!service)
          router.replace({ pathname: "/admin/services/[serviceId]", params: { serviceId: id } });
        else router.back();
      })
      .catch((error: unknown) => Alert.alert("Couldn't save", errorMessage(error)))
      .finally(() => setSaving(false));
  };

  const setActive = (active: boolean): void => {
    if (active || !service) return set("active", active);
    confirmChange(
      `Deactivate ${service.name}?`,
      "It disappears from booking. Existing appointments and history stay. You can reactivate it later.",
      "Deactivate",
      () => set("active", false)
    );
  };

  const linked = (doctorId: string): boolean =>
    !!service &&
    links.data.some((l) => l.serviceId === service.id && l.doctorId === doctorId && l.active);
  const toggleDoctor = (doctorId: string, name: string): void => {
    if (!hospitalId || !service) return;
    const next = !linked(doctorId);
    const apply = (): void => {
      repo
        .setLink(hospitalId, doctorId, service.id, next)
        .catch((error: unknown) => Alert.alert("Couldn't update doctors", errorMessage(error)));
    };
    if (next) apply();
    else
      confirmChange(
        `Remove ${name}?`,
        `${name} won't be offered for ${service.name} any more.`,
        "Remove",
        apply
      );
  };

  return (
    <Screen
      header={header}
      footer={<PrimaryButton label={saving ? "Saving…" : "Save service"} onPress={save} />}
    >
      <View className="flex-row items-center gap-3">
        <IconTile icon={asIcon(form.icon)} />
        <Typography type={textRole.supporting.type} color="muted" className="flex-1">
          {service
            ? "Changes apply to new bookings right away."
            : "New services are bookable once saved and active."}
        </Typography>
      </View>
      <AdminSection title="Details">
        <FormField
          label="Name"
          icon="tag-outline"
          value={form.name}
          onChangeText={(v) => set("name", v)}
          placeholder="e.g. Physiotherapy"
        />
        <FormField
          label="Description"
          icon="text"
          value={form.description}
          onChangeText={(v) => set("description", v)}
          placeholder="Short line patients see"
        />
        <FormField
          label="Who patients see"
          icon="account-outline"
          value={form.providerTitle}
          onChangeText={(v) => set("providerTitle", v)}
          placeholder="e.g. Physiotherapist"
        />
      </AdminSection>
      <AdminSection title="Category">
        <FilterChips
          options={CATEGORIES}
          selected={form.category}
          onSelect={(v) => set("category", v)}
        />
      </AdminSection>
      <AdminSection title="Icon">
        <View className="flex-row flex-wrap gap-2">
          {ICONS.map(({ id }) => (
            <Button
              key={id}
              size="sm"
              isIconOnly
              variant={form.icon === id ? "primary" : "secondary"}
              onPress={() => set("icon", id)}
              accessibilityLabel={`Icon ${id}`}
              accessibilityState={{ selected: form.icon === id }}
            >
              <IconTile icon={asIcon(id)} size="sm" />
            </Button>
          ))}
        </View>
      </AdminSection>
      <AdminSection title="Duration">
        <FilterChips
          options={DURATIONS}
          selected={form.duration}
          onSelect={(v) => set("duration", v)}
        />
      </AdminSection>
      <AdminSection title="Visit types">
        <View className="flex-row gap-2">
          {(["in-clinic", "online"] as const).map((mode) => (
            <Button
              key={mode}
              size="sm"
              variant={form.modes.includes(mode) ? "primary" : "secondary"}
              onPress={() => toggleMode(mode)}
              accessibilityState={{ selected: form.modes.includes(mode) }}
            >
              {mode === "in-clinic" ? "In-clinic" : "Online"}
            </Button>
          ))}
        </View>
      </AdminSection>
      <View className="flex-row items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3">
        <View className="flex-1">
          <Typography type={textRole.bodyStrong.type} weight="semibold">
            Active
          </Typography>
          <Typography type={textRole.supporting.type} color="muted">
            Shown to patients for booking
          </Typography>
        </View>
        <Switch isSelected={form.active} onSelectedChange={setActive} />
      </View>
      {service ? (
        <AdminSection title="Doctors">
          <View className="flex-row flex-wrap gap-2">
            {doctors.data
              .filter((d) => d.active || linked(d.id))
              .map((doctor) => (
                <Button
                  key={doctor.id}
                  size="sm"
                  variant={linked(doctor.id) ? "primary" : "secondary"}
                  onPress={() => toggleDoctor(doctor.id, doctor.name)}
                  accessibilityState={{ selected: linked(doctor.id) }}
                >
                  {doctor.name}
                </Button>
              ))}
          </View>
        </AdminSection>
      ) : null}
    </Screen>
  );
}
