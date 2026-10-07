import { PressableFeedback, Typography } from "heroui-native";
import type { JSX } from "react";
import { ScrollView, useWindowDimensions } from "react-native";

import { IconTile } from "@/components/ui/icon-tile";
import { layout, textRole } from "@/design-system";
import type { ServiceSummary } from "@/features/services/service-catalog";

/** Visible columns on a standard phone; the fraction lets the next tile peek. */
const VISIBLE_COLUMNS = 4.25;
/** Narrowest readable column (dp) before system font scaling. */
const MIN_COLUMN_WIDTH = 76;

type ServiceShortcutProps = {
  service: ServiceSummary;
  onPress: () => void;
  width: number;
};

/** 56dp rounded-square icon tile with its label underneath. */
function ServiceShortcut({ service, onPress, width }: ServiceShortcutProps): JSX.Element {
  const label = textRole.tileLabel;
  const name = service.shortName ?? service.name;

  return (
    <PressableFeedback
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Book ${service.name}`}
      className="items-center gap-2.5 rounded-2xl"
      style={{ width }}
    >
      <IconTile icon={service.icon} {...(service.tint ? { tint: service.tint } : {})} />
      <Typography.Paragraph
        type={label.type}
        align="center"
        numberOfLines={1}
        className={label.className}
      >
        {name}
      </Typography.Paragraph>
    </PressableFeedback>
  );
}

type ServiceShortcutRowProps = {
  services: ServiceSummary[];
  onPress: (service: ServiceSummary) => void;
};

/**
 * One horizontal row of shortcuts: about four visible on a standard phone,
 * with the next one peeking so the row reads as scrollable. Columns never
 * shrink below a readable width (and grow with system text size).
 */
export function ServiceShortcutRow({ services, onPress }: ServiceShortcutRowProps): JSX.Element {
  const { width: windowWidth, fontScale } = useWindowDimensions();
  const width = Math.max(
    (windowWidth - layout.screenGutter) / VISIBLE_COLUMNS,
    MIN_COLUMN_WIDTH * Math.max(1, fontScale)
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="-mx-4"
      contentContainerClassName="px-2"
    >
      {services.map((service) => (
        <ServiceShortcut
          key={service.id}
          service={service}
          width={width}
          onPress={() => onPress(service)}
        />
      ))}
    </ScrollView>
  );
}
