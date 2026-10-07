import { Typography } from "heroui-native";
import type { JSX } from "react";
import { View } from "react-native";

import { textRole } from "@/design-system";
import type { StatusTone } from "@/features/appointments/appointment";

const TONE_DOT: Record<StatusTone, string> = {
  neutral: "bg-muted",
  accent: "bg-brand-vivid",
  success: "bg-success",
  warning: "bg-warning",
  muted: "bg-separator",
};

const TONE_TEXT: Record<StatusTone, string> = {
  neutral: "text-muted",
  accent: "text-brand-text",
  success: "text-success",
  warning: "text-foreground",
  muted: "text-muted",
};

/** The one status treatment: a small dot plus short text (never a heavy pill). */
export function StatusText({ label, tone }: { label: string; tone: StatusTone }): JSX.Element {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className={`size-1.5 rounded-full ${TONE_DOT[tone]}`} />
      <Typography
        type={textRole.caption.type}
        weight="medium"
        numberOfLines={1}
        className={TONE_TEXT[tone]}
      >
        {label}
      </Typography>
    </View>
  );
}
