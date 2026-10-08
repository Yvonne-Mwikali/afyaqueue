import { useRouter } from "expo-router";
import { Button, Typography } from "heroui-native";
import { type JSX, useState } from "react";
import { Alert, View } from "react-native";

import { LoadingState } from "@/components/feedback/loading-state";
import { PatientHeader } from "@/components/shared/patient-header";
import { FilterChips } from "@/components/ui/filter-chips";
import { Screen } from "@/components/ui/screen";
import { SectionHeader } from "@/components/ui/section-header";
import { localDateKey } from "@/features/appointments/appointment";
import {
  ABSENCE_KINDS,
  type AbsenceKind,
  formatMinutes,
  WEEKDAYS,
} from "@/features/doctors/schedule";
import { useDoctorIdentity, useDoctorSchedule } from "@/features/doctors/use-doctor-workspace";
import { initialsFrom } from "@/features/users/user-profile";
import { textRole } from "@/design-system";
import { errorMessage } from "@/lib/app-error";
import { formatShortDate } from "@/utils/date-format";

/** Days ahead a doctor can mark as away from this screen (from tomorrow). */
const ABSENCE_DAYS_AHEAD = 21;

/**
 * Weekly hours (set by the hospital) and the doctor's own time off. Whole
 * days only for now; booking hides those days for this doctor.
 */
export default function DoctorScheduleRoute(): JSX.Element {
  const router = useRouter();
  const { doctor } = useDoctorIdentity();
  const schedule = useDoctorSchedule();
  const [busy, setBusy] = useState(false);

  const today = new Date();
  const days = Array.from(
    { length: ABSENCE_DAYS_AHEAD },
    (_, offset) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1 + offset)
  );
  const [dayKey, setDayKey] = useState(localDateKey(days[0] ?? today));
  const [kind, setKind] = useState<AbsenceKind>("leave");
  const { schedules, absences } = schedule.availability;
  const byDay = WEEKDAYS.map((label, dayOfWeek) => ({
    label,
    windows: schedules
      .filter((window) => window.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.startMinutes - b.startMinutes),
  })).filter((day) => day.windows.length > 0);

  const run = (action: () => Promise<void>): void => {
    if (busy) return;
    setBusy(true);
    action()
      .catch((error: unknown) => Alert.alert("Couldn't update your schedule", errorMessage(error)))
      .finally(() => setBusy(false));
  };

  const add = (): void => {
    const day = days.find((item) => localDateKey(item) === dayKey);
    if (day) run(() => schedule.addAbsence(day, kind));
  };

  return (
    <Screen>
      <PatientHeader
        title="Schedule"
        subtitle="Your weekly hours and time off."
        titleVariant="screen"
        initials={initialsFrom((doctor?.name ?? "").replace(/^Dr\.?\s+/, ""))}
        onPressProfile={() => router.navigate("/doctor/profile")}
      />

      {schedule.status === "loading" ? (
        <LoadingState title="Loading your schedule" />
      ) : schedule.status === "error" ? (
        <Typography.Paragraph color="muted">
          We couldn&apos;t load your schedule. Check your connection.
        </Typography.Paragraph>
      ) : (
        <>
          <View className="gap-2">
            <SectionHeader title="Weekly hours" />
            {byDay.length === 0 ? (
              <Typography type={textRole.supporting.type} color="muted">
                No weekly hours are set. Patients can&apos;t book you until the hospital adds them.
              </Typography>
            ) : (
              <View className="gap-1.5 rounded-2xl border border-border bg-surface px-4 py-3">
                {byDay.map((day) => (
                  <View key={day.label} className="flex-row justify-between gap-3">
                    <Typography type={textRole.bodyStrong.type} weight="semibold">
                      {day.label}
                    </Typography>
                    <Typography type={textRole.supporting.type} color="muted">
                      {day.windows
                        .map(
                          (w) => `${formatMinutes(w.startMinutes)}–${formatMinutes(w.endMinutes)}`
                        )
                        .join(", ")}
                    </Typography>
                  </View>
                ))}
              </View>
            )}
            <Typography type={textRole.caption.type} color="muted">
              Weekly hours are managed by the hospital.
            </Typography>
          </View>

          <View className="gap-2">
            <SectionHeader title="Time off" />
            {absences.length === 0 ? (
              <Typography type={textRole.supporting.type} color="muted">
                No time off planned.
              </Typography>
            ) : (
              absences.map((absence) => {
                const label = ABSENCE_KINDS.find((item) => item.id === absence.kind)?.label;
                const future = absence.startAt.getTime() > today.getTime();
                return (
                  <View
                    key={absence.id}
                    className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-2.5"
                  >
                    <View className="flex-1">
                      <Typography type={textRole.bodyStrong.type} weight="semibold">
                        {formatShortDate(absence.startAt)}
                      </Typography>
                      <Typography type={textRole.supporting.type} color="muted">
                        {label}
                      </Typography>
                    </View>
                    {future ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        hitSlop={4}
                        isDisabled={busy}
                        onPress={() => run(() => schedule.removeAbsence(absence.id))}
                        accessibilityLabel={`Remove time off on ${formatShortDate(absence.startAt)}`}
                      >
                        <Button.Label className="text-danger">Remove</Button.Label>
                      </Button>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>

          <View className="gap-3">
            <SectionHeader title="Add time off" />
            <FilterChips
              options={days.map((day) => ({ id: localDateKey(day), label: formatShortDate(day) }))}
              selected={dayKey}
              onSelect={setDayKey}
            />
            <FilterChips options={ABSENCE_KINDS} selected={kind} onSelect={setKind} />
            <Button variant="secondary" isDisabled={busy} onPress={add}>
              {busy ? "Saving…" : "Add whole day off"}
            </Button>
          </View>
        </>
      )}
    </Screen>
  );
}
