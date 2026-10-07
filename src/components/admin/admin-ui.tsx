import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomSheet, Button, PressableFeedback, Typography } from "heroui-native";
import type { JSX, ReactNode } from "react";
import { Alert, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { IconName } from "@/components/ui/icon-tile";
import { iconSize, spacing, textRole, useBrandColor } from "@/design-system";

/** Asks before a high-impact change (deactivate, role change, unassign). */
export function confirmChange(
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void,
  destructive = true
): void {
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: confirmLabel, style: destructive ? "destructive" : "default", onPress: onConfirm },
  ]);
}

/** Valid MaterialCommunityIcons name, or a neutral fallback. */
export function asIcon(name: string): IconName {
  return name in MaterialCommunityIcons.glyphMap ? (name as IconName) : "medical-bag";
}

function Tile({ icon, size = "md" }: { icon: IconName; size?: "sm" | "md" }): JSX.Element {
  const vivid = useBrandColor("brand-vivid");
  return (
    <View
      className={`items-center justify-center bg-brand-subtle ${size === "md" ? "size-11 rounded-2xl" : "size-9 rounded-xl"}`}
    >
      <MaterialCommunityIcons
        name={icon}
        size={size === "md" ? iconSize.lg : iconSize.md}
        color={vivid}
      />
    </View>
  );
}

export type PillTone = "success" | "warning" | "muted" | "accent";

const PILL: Record<PillTone, string> = {
  success: "bg-success/12 text-success",
  warning: "bg-warning/15 text-foreground",
  muted: "bg-default text-muted",
  accent: "bg-brand-subtle text-brand-subtle-foreground",
};

export function StatusPill({ label, tone }: { label: string; tone: PillTone }): JSX.Element {
  const [bg, fg] = PILL[tone].split(" ");
  return (
    <View className={`rounded-full px-2.5 py-0.5 ${bg}`}>
      <Typography type={textRole.caption.type} weight="semibold" className={fg}>
        {label}
      </Typography>
    </View>
  );
}

/** Admin home card: icon, title, count line, description, chevron. */
export function AdminCard({
  icon,
  title,
  count,
  description,
  onPress,
}: {
  icon: IconName;
  title: string;
  count?: string;
  description: string;
  onPress: () => void;
}): JSX.Element {
  const vivid = useBrandColor("brand-vivid");
  return (
    <PressableFeedback
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, count, description].filter(Boolean).join(". ")}
      className="rounded-3xl"
    >
      <View className="flex-row items-center gap-3 rounded-3xl border border-border bg-surface px-4 py-3.5 shadow-surface">
        <Tile icon={icon} />
        <View className="flex-1 gap-0.5">
          <Typography type={textRole.itemTitle.type} weight={textRole.itemTitle.weight}>
            {title}
          </Typography>
          {count ? (
            <Typography
              type={textRole.supporting.type}
              weight="semibold"
              className="text-brand-text"
            >
              {count}
            </Typography>
          ) : null}
          <Typography type={textRole.caption.type} color="muted" numberOfLines={2}>
            {description}
          </Typography>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={iconSize.md} color={vivid} />
      </View>
    </PressableFeedback>
  );
}

/** Compact list row (member, doctor, service, audit). */
export function AdminRow({
  title,
  subtitle,
  detail,
  pill,
  icon,
  muted = false,
  onPress,
}: {
  title: string;
  subtitle?: string;
  detail?: string;
  pill?: { label: string; tone: PillTone };
  icon?: IconName;
  muted?: boolean;
  onPress?: () => void;
}): JSX.Element {
  const vivid = useBrandColor("brand-vivid");
  const body = (
    <View
      className={`flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3 ${muted ? "opacity-60" : ""}`}
    >
      {icon ? <Tile icon={icon} size="sm" /> : null}
      <View className="flex-1 gap-0.5">
        <Typography type={textRole.bodyStrong.type} weight="semibold" numberOfLines={1}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography type={textRole.supporting.type} color="muted" numberOfLines={1}>
            {subtitle}
          </Typography>
        ) : null}
        {detail ? (
          <Typography type={textRole.caption.type} color="muted" numberOfLines={1}>
            {detail}
          </Typography>
        ) : null}
      </View>
      {pill ? <StatusPill {...pill} /> : null}
      {onPress ? (
        <MaterialCommunityIcons name="chevron-right" size={iconSize.md} color={vivid} />
      ) : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <PressableFeedback
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, pill?.label, detail].filter(Boolean).join(", ")}
      className="rounded-2xl"
    >
      {body}
    </PressableFeedback>
  );
}

/** Titled card section; `action` sits top-right (e.g. "Edit"). */
export function AdminSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; onPress: () => void };
  children: ReactNode;
}): JSX.Element {
  return (
    <View className="gap-3 rounded-3xl border border-border bg-surface p-4">
      <View className="flex-row items-center justify-between">
        <Typography
          type={textRole.itemTitle.type}
          weight={textRole.itemTitle.weight}
          accessibilityRole="header"
        >
          {title}
        </Typography>
        {action ? (
          <Button size="sm" variant="ghost" onPress={action.onPress} hitSlop={6}>
            <Button.Label className="text-brand-text">{action.label}</Button.Label>
          </Button>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** Friendly empty state with an optional action. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: IconName;
  title: string;
  description: string;
  action?: { label: string; onPress: () => void };
}): JSX.Element {
  return (
    <View className="items-center gap-2 rounded-3xl bg-surface-secondary px-6 py-8">
      <Tile icon={icon} />
      <Typography type={textRole.itemTitle.type} weight={textRole.itemTitle.weight} align="center">
        {title}
      </Typography>
      <Typography type={textRole.supporting.type} color="muted" align="center">
        {description}
      </Typography>
      {action ? (
        <Button variant="secondary" size="sm" className="mt-2" onPress={action.onPress}>
          {action.label}
        </Button>
      ) : null}
    </View>
  );
}

/** Titled bottom sheet used for invites, filters and member actions. */
export function AdminSheet({
  isOpen,
  onClose,
  title,
  description,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}): JSX.Element {
  const insets = useSafeAreaInsets();
  return (
    <BottomSheet isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content>
          <View className="gap-4" style={{ paddingBottom: insets.bottom + spacing.md }}>
            <View className="gap-1">
              <BottomSheet.Title>{title}</BottomSheet.Title>
              {description ? (
                <Typography type={textRole.supporting.type} color="muted">
                  {description}
                </Typography>
              ) : null}
            </View>
            {children}
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}

/** One option in a sheet (e.g. "Make admin", "Deactivate"). */
export function SheetAction({
  label,
  description,
  destructive = false,
  onPress,
}: {
  label: string;
  description?: string;
  destructive?: boolean;
  onPress: () => void;
}): JSX.Element {
  return (
    <PressableFeedback onPress={onPress} accessibilityRole="button" className="rounded-2xl">
      <View className="min-h-12 justify-center rounded-2xl border border-border px-4 py-2.5">
        <Typography
          type={textRole.bodyStrong.type}
          weight="semibold"
          className={destructive ? "text-danger" : ""}
        >
          {label}
        </Typography>
        {description ? (
          <Typography type={textRole.caption.type} color="muted">
            {description}
          </Typography>
        ) : null}
      </View>
    </PressableFeedback>
  );
}
