import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomSheet, PressableFeedback, Typography, useThemeColor } from "heroui-native";
import { type JSX, useState } from "react";
import { Alert, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { iconSize, spacing, textRole, useBrandColor } from "@/design-system";
import { ACTION_LABELS, actionsFor, type QueueAction } from "@/features/queues/queue-actions";
import type { StaffQueueEntry } from "@/features/staff/staff-queue";
import { entryCallTarget, useCallPatient } from "@/features/staff/use-call-patient";
import { useQueueActions } from "@/features/staff/use-staff-queues";
import { errorMessage } from "@/lib/app-error";

const DESTRUCTIVE: QueueAction[] = ["no-show"];

/**
 * Contextual queue actions for staff and doctor screens: the likeliest
 * next step on the row, everything else in a sheet behind "⋯". Every
 * action runs as one audited transaction; rules decide what is allowed.
 */
export function useQueueEntryControls(): {
  rowProps: (entry: StaffQueueEntry) => {
    action?: { label: string; onPress: () => void; busy: boolean };
    onMore?: () => void;
  };
  run: (entry: StaffQueueEntry, action: QueueAction) => void;
  busyId: string | null;
  sheet: JSX.Element;
} {
  const insets = useSafeAreaInsets();
  const actions = useQueueActions();
  const callPatient = useCallPatient();
  const muted = useThemeColor("muted");
  const vivid = useBrandColor("brand-vivid");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<StaffQueueEntry | null>(null);

  const execute = (entry: StaffQueueEntry, action: QueueAction): void => {
    if (busyId) return;
    setBusyId(entry.id);
    const work =
      action === "call"
        ? actions.callNext(entry.queueId, [entry.id]).then((called) => {
            if (!called) Alert.alert("Couldn't call", "This patient is no longer waiting.");
          })
        : actions.perform(entry, action);
    work
      .catch((error: unknown) => Alert.alert("Couldn't update the queue", errorMessage(error)))
      .finally(() => setBusyId(null));
  };

  const run = (entry: StaffQueueEntry, action: QueueAction): void => {
    if (action !== "no-show") return execute(entry, action);
    Alert.alert(
      `Mark #${entry.queueNumber} as no-show?`,
      "They leave the queue and the visit is recorded as missed. This can't be undone.",
      [
        { text: "Keep in queue", style: "cancel" },
        { text: "No Show", style: "destructive", onPress: () => execute(entry, action) },
      ]
    );
  };

  const secondary = menuFor ? actionsFor(menuFor, new Date()).secondary : [];

  return {
    busyId,
    run,
    rowProps: (entry) => {
      const { primary } = actionsFor(entry, new Date());
      return {
        ...(primary
          ? {
              action: {
                label: ACTION_LABELS[primary],
                onPress: () => run(entry, primary),
                busy: busyId === entry.id,
              },
            }
          : {}),
        // Always available: Call patient (phone) lives in the sheet too.
        onMore: () => setMenuFor(entry),
      };
    },
    sheet: (
      <BottomSheet isOpen={menuFor !== null} onOpenChange={(open) => !open && setMenuFor(null)}>
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content>
            <View className="gap-3" style={{ paddingBottom: insets.bottom + spacing.sm }}>
              <BottomSheet.Title>
                {menuFor ? `#${menuFor.queueNumber} · ${menuFor.patientName || "Patient"}` : ""}
              </BottomSheet.Title>
              {menuFor && (menuFor.callCount ?? 0) > 1 ? (
                <Typography type={textRole.supporting.type} color="muted">
                  Called {menuFor.callCount} times
                </Typography>
              ) : null}
              {menuFor ? (
                <PressableFeedback
                  onPress={() => {
                    const entry = menuFor;
                    setMenuFor(null);
                    callPatient(entryCallTarget(entry));
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    menuFor.patientPhone
                      ? `Call patient on ${menuFor.patientPhone}`
                      : "Call patient. No phone number on file"
                  }
                  accessibilityHint="Opens your phone's dialer. The queue doesn't change."
                  className="rounded-2xl"
                >
                  <View className="min-h-14 flex-row items-center gap-3 rounded-2xl bg-brand-subtle px-4 py-2">
                    <MaterialCommunityIcons
                      name="phone-outline"
                      size={iconSize.md}
                      color={menuFor.patientPhone ? vivid : muted}
                    />
                    <View className="flex-1">
                      <Typography type={textRole.bodyStrong.type} weight="semibold">
                        Call patient
                      </Typography>
                      <Typography type={textRole.caption.type} color="muted">
                        {menuFor.patientPhone || "No phone number on file"}
                      </Typography>
                    </View>
                  </View>
                </PressableFeedback>
              ) : null}
              <View className="gap-1.5">
                {secondary.map((action) => (
                  <PressableFeedback
                    key={action}
                    onPress={() => {
                      const entry = menuFor;
                      setMenuFor(null);
                      if (entry) run(entry, action);
                    }}
                    accessibilityRole="button"
                    className="rounded-2xl"
                  >
                    <View className="min-h-12 justify-center rounded-2xl border border-border px-4">
                      <Typography
                        type={textRole.bodyStrong.type}
                        weight="semibold"
                        className={DESTRUCTIVE.includes(action) ? "text-danger" : ""}
                      >
                        {ACTION_LABELS[action]}
                      </Typography>
                    </View>
                  </PressableFeedback>
                ))}
              </View>
            </View>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>
    ),
  };
}
