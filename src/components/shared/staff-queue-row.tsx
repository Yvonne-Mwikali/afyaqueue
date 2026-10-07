import { Button, PressableFeedback, Typography } from "heroui-native";
import type { JSX } from "react";
import { View } from "react-native";

import { StatusText } from "@/components/ui/status-text";
import { textRole } from "@/design-system";
import type { StatusTone } from "@/features/appointments/appointment";
import type { RosterStatus } from "@/features/staff/roster";

const STAFF_STATUS: Partial<Record<RosterStatus, { label: string; tone: StatusTone }>> = {
  booked: { label: "Not checked in", tone: "neutral" },
  waiting: { label: "Waiting", tone: "accent" },
  called: { label: "Called", tone: "warning" },
  "in-service": { label: "In Service", tone: "success" },
  completed: { label: "Completed", tone: "muted" },
  "on-hold": { label: "On hold", tone: "warning" },
  held: { label: "Held", tone: "warning" },
  "no-show": { label: "No show", tone: "muted" },
  delayed: { label: "Delayed", tone: "warning" },
};

type StaffQueueRowProps = {
  /** null before check-in (no queue number yet). */
  queueNumber: number | null;
  name: string;
  /** Service and/or doctor, e.g. "Oncology · Dr. Njeri Mwangi". */
  context: string;
  time: string;
  status: RosterStatus;
  /** Makes the row open a detail (e.g. the patient visit). */
  onPress?: () => void;
  /** Opens more actions (sheet). */
  onMore?: () => void;
  /** e.g. "Called 2 times · 1 min ago". */
  note?: string;
  action?: { label: string; onPress: () => void; busy?: boolean };
};

/** One patient in a staff queue list: number tile, name, context, status and time. */
export function StaffQueueRow({
  queueNumber,
  name,
  context,
  time,
  status,
  onPress,
  onMore,
  note,
  action,
}: StaffQueueRowProps): JSX.Element {
  const presentation = STAFF_STATUS[status] ?? { label: status, tone: "neutral" as const };
  const numberLabel = queueNumber === null ? "No queue number yet" : `Number ${queueNumber}`;

  const body = (
    <View
      className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-2.5"
      accessible={!action && !onPress}
      accessibilityLabel={`${numberLabel}, ${name}, ${context}, ${presentation.label}, ${time}`}
    >
      <View className="size-10 items-center justify-center rounded-xl bg-brand-subtle">
        <Typography
          type={textRole.bodyStrong.type}
          weight="bold"
          className="text-brand-subtle-foreground"
        >
          {queueNumber ?? "–"}
        </Typography>
      </View>
      <View className="flex-1 gap-0.5">
        <Typography type={textRole.bodyStrong.type} weight="semibold" numberOfLines={1}>
          {name}
        </Typography>
        <Typography type={textRole.supporting.type} color="muted" numberOfLines={1}>
          {context}
        </Typography>
        {note ? (
          <Typography type={textRole.caption.type} className="text-brand-text" numberOfLines={1}>
            {note}
          </Typography>
        ) : null}
      </View>
      <View className="items-end gap-1">
        <StatusText label={presentation.label} tone={presentation.tone} />
        <Typography type={textRole.caption.type} color="muted">
          {time}
        </Typography>
      </View>
      {action ? (
        <Button
          size="sm"
          variant="secondary"
          hitSlop={4}
          isDisabled={action.busy}
          onPress={action.onPress}
          accessibilityLabel={`${action.label} for ${numberLabel.toLowerCase()}, ${name}`}
        >
          <Button.Label>{action.busy ? "…" : action.label}</Button.Label>
        </Button>
      ) : null}
      {onMore ? (
        <Button
          size="sm"
          variant="ghost"
          isIconOnly
          hitSlop={4}
          onPress={onMore}
          accessibilityLabel={`More actions for ${numberLabel.toLowerCase()}, ${name}`}
        >
          <Button.Label>⋯</Button.Label>
        </Button>
      ) : null}
    </View>
  );

  if (!onPress) return body;
  return (
    <PressableFeedback
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${presentation.label}, ${time}`}
      accessibilityHint="Opens today's visit"
      className="rounded-2xl"
    >
      {body}
    </PressableFeedback>
  );
}
