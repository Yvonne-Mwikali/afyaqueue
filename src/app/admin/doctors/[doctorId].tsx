import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, Switch, Typography } from "heroui-native";
import { type JSX, useEffect, useState } from "react";
import { Alert, View } from "react-native";

import {
  AdminSection,
  AdminSheet,
  confirmChange,
  EmptyState,
  StatusPill,
} from "@/components/admin/admin-ui";
import { LoadingState } from "@/components/feedback/loading-state";
import { FilterChips } from "@/components/ui/filter-chips";
import { FormField } from "@/components/ui/form-field";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { textRole } from "@/design-system";
import type { AdminDoctor } from "@/features/admin/admin";
import { ACCOUNT_LABEL, accountStatus } from "@/features/admin/doctor-status";
import {
  useAdminActions,
  useAdminDoctors,
  useAdminInvites,
  useAdminLinks,
  useAdminMembers,
  useAdminSchedule,
  useAdminServices,
} from "@/features/admin/use-admin";
import { localDateKey } from "@/features/appointments/appointment";
import { ABSENCE_KINDS, type AbsenceKind, WEEKDAYS } from "@/features/doctors/schedule";
import type { DoctorAvailability } from "@/features/doctors/schedule-repository";
import { normalizeEmail } from "@/features/hospitals/hospital";
import { errorMessage } from "@/lib/app-error";
import { scheduleRepository } from "@/lib/backend";
import { formatShortDate } from "@/utils/date-format";

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const LENGTHS = [
  { id: "1", label: "1 day" },
  { id: "2", label: "2 days" },
  { id: "5", label: "5 days" },
  { id: "7", label: "1 week" },
];

export default function AdminDoctorRoute(): JSX.Element {
  const router = useRouter();
  const { doctorId } = useLocalSearchParams<{ doctorId: string }>();
  const doctors = useAdminDoctors();
  const doctor = doctors.data.find((d) => d.id === doctorId);
  const header = <ScreenHeader title={doctor?.name ?? "Doctor"} onBack={() => router.back()} />;

  if (doctors.status === "loading") {
    return (
      <Screen header={header}>
        <LoadingState title="Loading doctor" />
      </Screen>
    );
  }
  if (!doctor) {
    return (
      <Screen header={header}>
        <EmptyState
          icon="doctor"
          title="Doctor not found"
          description="This doctor isn't part of your hospital."
        />
      </Screen>
    );
  }
  return (
    <Screen header={header}>
      <DoctorCard doctor={doctor} />
      <AccountCard doctor={doctor} />
      <ServicesCard doctor={doctor} />
      <ScheduleCard doctor={doctor} />
      <TimeOffCard doctor={doctor} />
    </Screen>
  );
}

function DoctorCard({ doctor }: { doctor: AdminDoctor }): JSX.Element {
  const { repo, hospitalId } = useAdminActions();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: doctor.name,
    specialty: doctor.specialty,
    hospital: doctor.hospital,
  });
  const [saving, setSaving] = useState(false);

  const save = (active: boolean, fields = form): Promise<void> | undefined =>
    hospitalId
      ? repo
          .saveDoctor(hospitalId, doctor.id, { ...fields, active })
          .then(() => undefined)
          .catch((error: unknown) => Alert.alert("Couldn't save", errorMessage(error)))
      : undefined;

  const setActive = (active: boolean): void => {
    if (active) void save(true, doctor);
    else
      confirmChange(
        `Deactivate ${doctor.name}?`,
        "Patients can't book them any more. Existing appointments stay as they are.",
        "Deactivate",
        () => void save(false, doctor)
      );
  };

  return (
    <AdminSection title="Doctor" action={{ label: "Edit", onPress: () => setEditing(true) }}>
      <View className="gap-0.5">
        <Typography type={textRole.cardPrimary.type} weight={textRole.cardPrimary.weight}>
          {doctor.name}
        </Typography>
        <Typography type={textRole.supporting.type} color="muted">
          {[doctor.specialty, doctor.hospital].filter(Boolean).join(" · ")}
        </Typography>
      </View>
      <View className="flex-row items-center justify-between rounded-2xl bg-surface-secondary px-3 py-2.5">
        <View>
          <Typography type={textRole.bodyStrong.type} weight="semibold">
            {doctor.active ? "Active" : "Inactive"}
          </Typography>
          <Typography type={textRole.caption.type} color="muted">
            {doctor.active ? "Bookable by patients" : "Hidden from booking"}
          </Typography>
        </View>
        <Switch isSelected={doctor.active} onSelectedChange={setActive} />
      </View>
      <AdminSheet isOpen={editing} onClose={() => setEditing(false)} title="Edit doctor">
        <FormField
          label="Full name"
          icon="account-outline"
          value={form.name}
          onChangeText={(name) => setForm({ ...form, name })}
        />
        <FormField
          label="Specialty"
          icon="stethoscope"
          value={form.specialty}
          onChangeText={(specialty) => setForm({ ...form, specialty })}
        />
        <FormField
          label="Facility / clinic"
          icon="hospital-building"
          value={form.hospital}
          onChangeText={(hospital) => setForm({ ...form, hospital })}
        />
        <PrimaryButton
          label={saving ? "Saving…" : "Save"}
          onPress={() => {
            if (!form.name.trim() || !form.specialty.trim())
              return Alert.alert("Missing details", "Name and specialty are required.");
            setSaving(true);
            void save(doctor.active, {
              name: form.name.trim(),
              specialty: form.specialty.trim(),
              hospital: form.hospital.trim(),
            })?.finally(() => {
              setSaving(false);
              setEditing(false);
            });
          }}
        />
      </AdminSheet>
    </AdminSection>
  );
}

function AccountCard({ doctor }: { doctor: AdminDoctor }): JSX.Element {
  const { repo, hospitalId } = useAdminActions();
  const invites = useAdminInvites();
  const members = useAdminMembers();
  const status = accountStatus(doctor, invites.data);
  const linked = members.data.find((m) => m.userId === doctor.userId);
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const sendInvite = (): void => {
    if (!hospitalId || state === "saving") return;
    setState("saving");
    const existing = invites.data.find((i) => i.email === normalizeEmail(email));
    repo.invite(hospitalId, email, "doctor", { id: doctor.id, name: doctor.name }, existing).then(
      () => setState("done"),
      (failure: unknown) => {
        setState("idle");
        setError(errorMessage(failure));
      }
    );
  };
  const close = (): void => {
    setInviting(false);
    setEmail("");
    setState("idle");
    setError(null);
  };

  return (
    <AdminSection title="Account">
      <View className="flex-row items-center justify-between gap-3">
        <Typography type={textRole.supporting.type} color="muted" className="flex-1">
          {status.kind === "linked"
            ? (linked?.email ?? "Signed-in doctor account")
            : status.kind === "pending"
              ? status.invite.email
              : "No login yet. The doctor can still be booked."}
        </Typography>
        <StatusPill
          label={ACCOUNT_LABEL[status.kind]}
          tone={
            status.kind === "linked" ? "success" : status.kind === "pending" ? "warning" : "muted"
          }
        />
      </View>
      {status.kind === "none" ? (
        <Button variant="secondary" onPress={() => setInviting(true)}>
          Invite account
        </Button>
      ) : status.kind === "pending" ? (
        <Button
          variant="ghost"
          onPress={() =>
            confirmChange(
              "Cancel this invitation?",
              `${status.invite.email} won't be able to link with it.`,
              "Cancel invitation",
              () => {
                repo
                  .revokeInvite(status.invite.id)
                  .catch((e: unknown) => Alert.alert("Couldn't cancel", errorMessage(e)));
              }
            )
          }
        >
          <Button.Label className="text-danger">Cancel invitation</Button.Label>
        </Button>
      ) : linked && hospitalId ? (
        <Button
          variant="ghost"
          onPress={() =>
            confirmChange(
              "Unlink this login?",
              "The account becomes a staff member; the doctor record and its history stay.",
              "Unlink",
              () => {
                repo
                  .unlinkDoctorAccount(hospitalId, doctor.id, linked)
                  .catch((e: unknown) => Alert.alert("Couldn't unlink", errorMessage(e)));
              }
            )
          }
        >
          <Button.Label className="text-danger">Unlink login</Button.Label>
        </Button>
      ) : null}
      <AdminSheet
        isOpen={inviting}
        onClose={close}
        title={state === "done" ? "Invitation created" : `Invite ${doctor.name}`}
        description={
          state === "done"
            ? `Ask them to register (or sign in) with ${normalizeEmail(email)} and verify it. Their doctor workspace opens automatically.`
            : "They'll be linked to this doctor record when they sign in with this email."
        }
      >
        {state === "done" ? (
          <PrimaryButton label="Done" onPress={close} />
        ) : (
          <>
            <FormField
              label="Doctor's email"
              icon="email-outline"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                setError(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              {...(error ? { error } : {})}
            />
            <PrimaryButton
              label={state === "saving" ? "Inviting…" : "Send invitation"}
              onPress={sendInvite}
            />
          </>
        )}
      </AdminSheet>
    </AdminSection>
  );
}

function ServicesCard({ doctor }: { doctor: AdminDoctor }): JSX.Element {
  const services = useAdminServices();
  const links = useAdminLinks();
  const { repo, hospitalId } = useAdminActions();
  const linked = (id: string): boolean =>
    links.data.some((l) => l.doctorId === doctor.id && l.serviceId === id && l.active);
  const toggle = (id: string, name: string): void => {
    if (!hospitalId) return;
    const next = !linked(id);
    const apply = (): void => {
      repo
        .setLink(hospitalId, doctor.id, id, next)
        .catch((e: unknown) => Alert.alert("Couldn't update", errorMessage(e)));
    };
    if (next) apply();
    else
      confirmChange(
        `Remove ${name}?`,
        `${doctor.name} won't be offered for ${name} any more.`,
        "Remove",
        apply
      );
  };
  const shown = services.data.filter((s) => s.active || linked(s.id));
  return (
    <AdminSection title="Services">
      {shown.length === 0 ? (
        <Typography type={textRole.supporting.type} color="muted">
          No active services yet.
        </Typography>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {shown.map((service) => (
            <Button
              key={service.id}
              size="sm"
              variant={linked(service.id) ? "primary" : "secondary"}
              onPress={() => toggle(service.id, service.name)}
              accessibilityState={{ selected: linked(service.id) }}
            >
              {service.name}
            </Button>
          ))}
        </View>
      )}
    </AdminSection>
  );
}

function ScheduleCard({ doctor }: { doctor: AdminDoctor }): JSX.Element {
  const router = useRouter();
  const schedule = useAdminSchedule(doctor.id);
  const days = WEEK_ORDER.map((day) => ({
    day,
    windows: schedule.data
      .filter((w) => w.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map((w) => `${w.startTime}–${w.endTime}`),
  }));
  return (
    <AdminSection
      title="Weekly schedule"
      action={{
        label: "Edit",
        onPress: () =>
          router.push({ pathname: "/admin/schedule/[doctorId]", params: { doctorId: doctor.id } }),
      }}
    >
      {days.map(({ day, windows }) => (
        <View key={day} className="flex-row justify-between gap-3">
          <Typography type={textRole.supporting.type} weight="semibold" className="w-12">
            {WEEKDAYS[day]?.slice(0, 3)}
          </Typography>
          <Typography type={textRole.supporting.type} color="muted" className="flex-1 text-right">
            {windows.length ? windows.join(", ") : "Unavailable"}
          </Typography>
        </View>
      ))}
    </AdminSection>
  );
}

function TimeOffCard({ doctor }: { doctor: AdminDoctor }): JSX.Element {
  const { hospitalId } = useAdminActions();
  const members = useAdminMembers();
  const [availability, setAvailability] = useState<DoctorAvailability>({
    schedules: [],
    absences: [],
  });
  const [adding, setAdding] = useState(false);
  const today = new Date();
  const days = Array.from(
    { length: 30 },
    (_, i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1 + i)
  );
  const [start, setStart] = useState(localDateKey(days[0] ?? today));
  const [length, setLength] = useState("1");
  const [kind, setKind] = useState<AbsenceKind>("leave");

  useEffect(() => {
    if (!hospitalId) return;
    return scheduleRepository.watchForDoctor(
      hospitalId,
      doctor.id,
      setAvailability,
      () => undefined
    );
  }, [hospitalId, doctor.id]);

  const who = (uid: string): string =>
    uid === doctor.userId
      ? "the doctor"
      : (members.data.find((m) => m.userId === uid)?.displayName ?? "an admin");

  const add = (): void => {
    const first = days.find((d) => localDateKey(d) === start);
    if (!hospitalId || !first) return;
    scheduleRepository
      .addAbsence({
        hospitalId,
        doctorId: doctor.id,
        startAt: new Date(first.getFullYear(), first.getMonth(), first.getDate()),
        endAt: new Date(first.getFullYear(), first.getMonth(), first.getDate() + Number(length)),
        kind,
      })
      .then(() => setAdding(false))
      .catch((e: unknown) => Alert.alert("Couldn't add time off", errorMessage(e)));
  };

  return (
    <AdminSection title="Time off" action={{ label: "Add", onPress: () => setAdding(true) }}>
      {availability.absences.length === 0 ? (
        <Typography type={textRole.supporting.type} color="muted">
          No upcoming time off.
        </Typography>
      ) : (
        availability.absences.map((absence) => {
          const last = new Date(absence.endAt.getTime() - 1);
          const range =
            localDateKey(last) === localDateKey(absence.startAt)
              ? formatShortDate(absence.startAt)
              : `${formatShortDate(absence.startAt)} – ${formatShortDate(last)}`;
          return (
            <View
              key={absence.id}
              className="flex-row items-center gap-3 rounded-2xl bg-surface-secondary px-3 py-2.5"
            >
              <View className="flex-1">
                <Typography type={textRole.bodyStrong.type} weight="semibold">
                  {range}
                </Typography>
                <Typography type={textRole.caption.type} color="muted">
                  {ABSENCE_KINDS.find((k) => k.id === absence.kind)?.label} · by{" "}
                  {who(absence.createdBy)}
                </Typography>
              </View>
              <Button
                size="sm"
                variant="ghost"
                onPress={() =>
                  confirmChange(
                    "Remove this time off?",
                    "Patients can book these days again.",
                    "Remove",
                    () => {
                      scheduleRepository
                        .removeAbsence(absence.id)
                        .catch((e: unknown) => Alert.alert("Couldn't remove", errorMessage(e)));
                    }
                  )
                }
              >
                <Button.Label className="text-danger">Remove</Button.Label>
              </Button>
            </View>
          );
        })
      )}
      <AdminSheet
        isOpen={adding}
        onClose={() => setAdding(false)}
        title="Add time off"
        description="Whole days; booking hides them for this doctor."
      >
        <FilterChips
          options={days.map((d) => ({ id: localDateKey(d), label: formatShortDate(d) }))}
          selected={start}
          onSelect={setStart}
        />
        <FilterChips options={LENGTHS} selected={length} onSelect={setLength} />
        <FilterChips options={ABSENCE_KINDS} selected={kind} onSelect={setKind} />
        <PrimaryButton label="Add time off" onPress={add} />
      </AdminSheet>
    </AdminSection>
  );
}
