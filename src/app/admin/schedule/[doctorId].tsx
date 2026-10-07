import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, Typography } from "heroui-native";
import { type JSX, useState } from "react";
import { Alert, TextInput, View } from "react-native";

import { LoadingState } from "@/components/feedback/loading-state";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { textRole } from "@/design-system";
import { type AdminWindow, scheduleProblem } from "@/features/admin/admin";
import { useAdminActions, useAdminDoctors, useAdminSchedule } from "@/features/admin/use-admin";
import { WEEKDAYS } from "@/features/doctors/schedule";
import { errorMessage } from "@/lib/app-error";

/** Monday first, the way clinics plan a week. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Weekly windows editor: any number of windows per day; none = unavailable. */
export default function AdminScheduleRoute(): JSX.Element {
  const router = useRouter();
  const { doctorId } = useLocalSearchParams<{ doctorId: string }>();
  const schedule = useAdminSchedule(doctorId);
  const doctor = useAdminDoctors().data.find((d) => d.id === doctorId);
  const header = (
    <ScreenHeader
      title={doctor ? `${doctor.name} · hours` : "Weekly hours"}
      onBack={() => router.back()}
    />
  );

  if (schedule.status === "loading") {
    return (
      <Screen header={header}>
        <LoadingState title="Loading hours" />
      </Screen>
    );
  }
  return <Editor key={doctorId} doctorId={doctorId} initial={schedule.data} header={header} />;
}

function Editor({
  doctorId,
  initial,
  header,
}: {
  doctorId: string;
  initial: AdminWindow[];
  header: JSX.Element;
}): JSX.Element {
  const router = useRouter();
  const { repo, hospitalId } = useAdminActions();
  const [windows, setWindows] = useState<AdminWindow[]>(initial);
  const [saving, setSaving] = useState(false);

  const update = (index: number, patch: Partial<AdminWindow>): void =>
    setWindows((list) => list.map((w, i) => (i === index ? { ...w, ...patch } : w)));
  const add = (day: number): void => {
    const last = windows.filter((w) => w.dayOfWeek === day).at(-1);
    setWindows((list) => [
      ...list,
      last
        ? { dayOfWeek: day, startTime: "14:00", endTime: "17:00" }
        : { dayOfWeek: day, startTime: "08:00", endTime: "12:00" },
    ]);
  };

  const save = (): void => {
    const problem = scheduleProblem(windows);
    if (problem) {
      Alert.alert("Check the hours", problem);
      return;
    }
    if (!hospitalId || saving) return;
    setSaving(true);
    repo
      .saveSchedule(hospitalId, doctorId, windows)
      .then(() => router.back())
      .catch((error: unknown) => Alert.alert("Couldn't save hours", errorMessage(error)))
      .finally(() => setSaving(false));
  };

  return (
    <Screen
      header={header}
      footer={<PrimaryButton label={saving ? "Saving…" : "Save hours"} onPress={save} />}
    >
      <Typography type={textRole.supporting.type} color="muted">
        24-hour times in the hospital&apos;s time zone. Patients can book whole appointments inside
        these windows.
      </Typography>
      {WEEK_ORDER.map((day) => {
        const dayWindows = windows
          .map((w, index) => ({ w, index }))
          .filter(({ w }) => w.dayOfWeek === day);
        return (
          <View key={day} className="gap-2 rounded-2xl border border-border bg-surface px-4 py-3">
            <View className="flex-row items-center justify-between">
              <Typography type={textRole.bodyStrong.type} weight="semibold">
                {WEEKDAYS[day]}
              </Typography>
              <Button
                size="sm"
                variant="ghost"
                onPress={() => add(day)}
                accessibilityLabel={`Add hours on ${WEEKDAYS[day]}`}
              >
                <Button.Label className="text-brand-text">+ Add</Button.Label>
              </Button>
            </View>
            {dayWindows.length === 0 ? (
              <Typography type={textRole.supporting.type} color="muted">
                Unavailable
              </Typography>
            ) : (
              dayWindows.map(({ w, index }) => (
                <View key={index} className="flex-row items-center gap-2">
                  <TimeInput
                    label={`${WEEKDAYS[day]} start`}
                    value={w.startTime}
                    onChange={(startTime) => update(index, { startTime })}
                  />
                  <Typography color="muted">–</Typography>
                  <TimeInput
                    label={`${WEEKDAYS[day]} end`}
                    value={w.endTime}
                    onChange={(endTime) => update(index, { endTime })}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onPress={() => setWindows((list) => list.filter((_, i) => i !== index))}
                    accessibilityLabel={`Remove ${w.startTime} to ${w.endTime} on ${WEEKDAYS[day]}`}
                  >
                    <Button.Label className="text-danger">Remove</Button.Label>
                  </Button>
                </View>
              ))
            )}
          </View>
        );
      })}
    </Screen>
  );
}

function TimeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}): JSX.Element {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      accessibilityLabel={label}
      placeholder="08:00"
      keyboardType="numbers-and-punctuation"
      maxLength={5}
      className="h-11 w-20 rounded-xl border border-border bg-surface-secondary px-3 text-center font-medium text-foreground"
    />
  );
}
