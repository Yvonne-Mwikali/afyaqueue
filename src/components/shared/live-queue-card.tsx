import { Typography } from "heroui-native";
import type { JSX } from "react";
import { View } from "react-native";

import { BreathingHalo } from "@/components/feedback/motifs";
import { StatusText } from "@/components/ui/status-text";
import { textRole } from "@/design-system";
import { type QueueEntry, queueStatusPresentation } from "@/features/queues/queue-entry";

import { QueueTimeline } from "./queue-timeline";

/**
 * The Live Queue's lead composition: status, the patient's number (with a
 * calm breathing halo while the position is live), now serving / ahead /
 * wait in one row, a short message, and the queue timeline.
 */
export function LiveQueueCard({
  entry,
  serviceName,
}: {
  entry: QueueEntry;
  /** Names the queue being viewed, e.g. "Oncology" → "Oncology Queue". */
  serviceName: string;
}): JSX.Element {
  const { label, tone, message } = queueStatusPresentation(entry);
  const live = entry.status !== "completed";

  return (
    <View className="gap-3 rounded-3xl border border-border bg-surface p-3.5 shadow-surface">
      <View className="flex-row items-center justify-between">
        <Typography
          type={textRole.eyebrow.type}
          weight={textRole.eyebrow.weight}
          className={`text-brand-text ${textRole.eyebrow.className}`}
        >
          {serviceName} Queue
        </Typography>
        <StatusText label={label} tone={tone} />
      </View>

      <View
        className="items-center"
        accessible
        accessibilityLabel={`Your number is ${entry.queueNumber}`}
        accessibilityLiveRegion="polite"
      >
        <Typography type={textRole.supporting.type} color="muted">
          Your number
        </Typography>
        <View className="size-28 items-center justify-center">
          {live ? <BreathingHalo size={112} /> : null}
          <Typography
            type={textRole.queueNumber.type}
            weight={textRole.queueNumber.weight}
            className={`${textRole.queueNumber.className} text-brand-text`}
          >
            #{entry.queueNumber}
          </Typography>
        </View>
      </View>

      <View className="flex-row rounded-2xl bg-surface-secondary py-2">
        <Stat label="Now serving" value={`#${entry.nowServing}`} />
        <View className="w-px bg-separator" />
        <Stat label="People ahead" value={String(entry.peopleAhead)} />
        <View className="w-px bg-separator" />
        <Stat label="Est. wait" value={`~${entry.estimatedWaitMinutes} min`} />
      </View>

      <View className="items-center gap-0.5">
        <Typography.Paragraph type={textRole.supporting.type} weight="semibold" align="center">
          {message}
        </Typography.Paragraph>
        {live ? (
          <Typography.Paragraph type={textRole.caption.type} color="muted" align="center">
            Stay nearby. We&apos;ll update your position automatically.
          </Typography.Paragraph>
        ) : null}
      </View>

      <QueueTimeline nowServing={entry.nowServing} queueNumber={entry.queueNumber} />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <View className="flex-1 items-center px-1" accessible accessibilityLabel={`${label} ${value}`}>
      <Typography type={textRole.caption.type} color="muted" numberOfLines={1}>
        {label}
      </Typography>
      <Typography type={textRole.bodyStrong.type} weight="bold" numberOfLines={1}>
        {value}
      </Typography>
    </View>
  );
}
