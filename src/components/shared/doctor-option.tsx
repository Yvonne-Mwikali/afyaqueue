import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PressableFeedback, Typography } from "heroui-native";
import type { JSX, ReactNode } from "react";
import { View } from "react-native";

import { textRole, useBrandColor } from "@/design-system";
import type { Doctor } from "@/features/doctors/doctor";

type OptionShellProps = {
  selected: boolean;
  onSelect: () => void;
  accessibilityLabel: string;
  media: ReactNode;
  children: ReactNode;
};

/**
 * Compact selectable card: media slot, content and a radio. Selected keeps
 * the same card, adding a thin orange border and a faint warm tint.
 */
function OptionShell({
  selected,
  onSelect,
  accessibilityLabel,
  media,
  children,
}: OptionShellProps): JSX.Element {
  return (
    <PressableFeedback
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={accessibilityLabel}
      className="rounded-3xl"
    >
      <View
        className={`flex-row items-center gap-3 rounded-3xl border px-3 py-2.5 ${
          selected ? "border-brand-vivid/70 bg-brand-subtle/40" : "border-border bg-surface"
        }`}
      >
        {media}
        <View className="flex-1">{children}</View>
        <Radio selected={selected} />
      </View>
    </PressableFeedback>
  );
}

function Radio({ selected }: { selected: boolean }): JSX.Element {
  return (
    <View
      className={`size-6 shrink-0 items-center justify-center rounded-full border-2 ${
        selected ? "border-brand-vivid" : "border-muted/50"
      }`}
    >
      {selected ? <View className="size-3 rounded-full bg-brand-vivid" /> : null}
    </View>
  );
}

/** The first-class "Any available doctor" option: a simple choice, not a profile. */
export function AnyDoctorOption({
  providerTitle,
  selected,
  onSelect,
}: {
  providerTitle: string;
  selected: boolean;
  onSelect: () => void;
}): JSX.Element {
  const vivid = useBrandColor("brand-vivid");
  const subtitle = `Next available ${providerTitle.toLowerCase()}`;

  return (
    <OptionShell
      selected={selected}
      onSelect={onSelect}
      accessibilityLabel={`Any available doctor. ${subtitle}. Shortest wait time.`}
      media={
        <View className="size-12 items-center justify-center rounded-2xl bg-brand-subtle">
          <MaterialCommunityIcons name="account-group" size={26} color={vivid} />
        </View>
      }
    >
      <Typography type={textRole.cardPrimary.type} weight={textRole.cardPrimary.weight}>
        Any available doctor
      </Typography>
      <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
        <Typography.Paragraph type={textRole.supporting.type} color="muted">
          {subtitle}
        </Typography.Paragraph>
        <View className="rounded-md bg-brand-subtle px-1.5 py-0.5">
          <Typography
            type={textRole.caption.type}
            weight="semibold"
            className="text-brand-subtle-foreground"
          >
            Shortest wait time
          </Typography>
        </View>
      </View>
    </OptionShell>
  );
}

/** A specific doctor: portrait slot, name, specialty, and one rating · hospital line. */
export function DoctorOption({
  doctor,
  selected,
  onSelect,
}: {
  doctor: Doctor;
  selected: boolean;
  onSelect: () => void;
}): JSX.Element {
  const vivid = useBrandColor("brand-vivid");

  return (
    <OptionShell
      selected={selected}
      onSelect={onSelect}
      accessibilityLabel={`${doctor.name}, ${doctor.title}. Rated ${doctor.rating} from ${doctor.reviewCount} reviews. ${doctor.facility}.`}
      media={
        // Portrait slot; initials until owned photos exist.
        <View className="size-14 items-center justify-center rounded-2xl bg-linear-to-br from-tile-from to-tile-to">
          <Typography
            type={textRole.cardPrimary.type}
            weight="bold"
            className="text-brand-subtle-foreground"
          >
            {doctor.initials}
          </Typography>
        </View>
      }
    >
      <Typography type={textRole.cardPrimary.type} weight={textRole.cardPrimary.weight}>
        {doctor.name}
      </Typography>
      <Typography.Paragraph type={textRole.supporting.type} color="muted">
        {doctor.title}
      </Typography.Paragraph>
      {/* Rating and hospital share one line and wrap together on narrow screens. */}
      <View className="flex-row flex-wrap items-center gap-x-1">
        <MaterialCommunityIcons name="star" size={14} color={vivid} />
        <Typography type={textRole.caption.type} weight="semibold" className="text-brand-text">
          {doctor.rating.toFixed(1)}
        </Typography>
        <Typography type={textRole.caption.type} color="muted">
          ({doctor.reviewCount}) · {doctor.facility}
        </Typography>
      </View>
    </OptionShell>
  );
}
