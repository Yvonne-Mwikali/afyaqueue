import { useRouter } from "expo-router";
import { Typography } from "heroui-native";
import { type JSX, useState } from "react";
import { Alert, View } from "react-native";

import { LoadingState } from "@/components/feedback/loading-state";
import { PatientHeader } from "@/components/shared/patient-header";
import { useQueueEntryControls } from "@/components/shared/queue-entry-controls";
import { StaffQueueRow } from "@/components/shared/staff-queue-row";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Screen } from "@/components/ui/screen";
import { textRole } from "@/design-system";
import { useDoctorIdentity } from "@/features/doctors/use-doctor-workspace";
import { useDoctors } from "@/features/doctors/use-doctors";
import { callOrder, inQueueOrder } from "@/features/queues/queue-order";
import { useServiceCatalog } from "@/features/services/use-service-catalog";
import { activeStaffEntries, callNote, queueCounts, rowText } from "@/features/staff/staff-view";
import { useDoctorEntries, useQueueActions } from "@/features/staff/use-staff-queues";
import { initialsFrom } from "@/features/users/user-profile";
import { errorMessage } from "@/lib/app-error";

/**
 * Patients checked in for this doctor today, in queue order, with the same
 * actions as staff, but only on entries assigned to this doctor (rules
 * enforce it). "Any available doctor" patients stay with staff.
 */
export default function DoctorQueueRoute(): JSX.Element {
  const router = useRouter();
  const { doctorId, doctor } = useDoctorIdentity();
  const entries = useDoctorEntries(doctorId);
  const { services } = useServiceCatalog();
  const { doctors } = useDoctors();
  const active = inQueueOrder(activeStaffEntries(entries.data));
  const counts = queueCounts(entries.data);
  const waiting = callOrder(entries.data);
  const controls = useQueueEntryControls();
  const queueActions = useQueueActions();
  const [calling, setCalling] = useState(false);

  // Next of *my* waiting patients, across services; each call is checked
  // against that patient's own queue.
  const callNext = async (): Promise<void> => {
    if (calling) return;
    setCalling(true);
    try {
      for (const entry of waiting) {
        if (await queueActions.callNext(entry.queueId, [entry.id])) return;
      }
      Alert.alert("Nobody is waiting", "All of your patients have been called.");
    } catch (error) {
      Alert.alert("Couldn't call", errorMessage(error));
    } finally {
      setCalling(false);
    }
  };

  return (
    <Screen
      footer={
        <PrimaryButton
          label={calling ? "Calling…" : "Call Next"}
          icon="bullhorn-outline"
          isDisabled={waiting.length === 0}
          accessibilityHint={waiting.length === 0 ? "Nobody is waiting for you" : undefined}
          onPress={() => void callNext()}
        />
      }
    >
      <PatientHeader
        title="My Queue"
        subtitle="Patients checked in for you today."
        titleVariant="screen"
        initials={initialsFrom((doctor?.name ?? "").replace(/^Dr\.?\s+/, ""))}
        onPressProfile={() => router.navigate("/doctor/profile")}
      />
      <Typography type={textRole.supporting.type} color="muted">
        {counts.waiting} waiting · {counts.called} called · {counts.held} held · {counts.inService}{" "}
        in service · {counts.completed} done
      </Typography>
      {entries.status === "loading" ? (
        <LoadingState title="Loading your queue" />
      ) : entries.status === "error" ? (
        <Typography.Paragraph color="muted">
          We couldn&apos;t load your queue. Check your connection.
        </Typography.Paragraph>
      ) : active.length === 0 ? (
        <Typography.Paragraph color="muted" align="center" className="py-8">
          Nobody is waiting for you right now.
        </Typography.Paragraph>
      ) : (
        <View className="gap-2">
          {active.map((entry) => (
            <StaffQueueRow
              key={entry.id}
              queueNumber={entry.queueNumber}
              status={entry.status}
              {...rowText(entry, services, doctors)}
              {...(callNote(entry) ? { note: callNote(entry) } : {})}
              {...controls.rowProps(entry)}
            />
          ))}
        </View>
      )}
      {controls.sheet}
    </Screen>
  );
}
