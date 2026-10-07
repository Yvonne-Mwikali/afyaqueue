import { useSegments } from "expo-router";
import { BottomTabBarHeightContext } from "expo-router/tabs";
import { type JSX, type ReactNode, useContext, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cradleTabBarClearance } from "@/components/navigation/cradle-tab-bar";
import { layout, spacing } from "@/design-system";

type ScreenProps = {
  children: ReactNode;
  /** Fixed above the scrolling content (e.g. a back header). */
  header?: ReactNode;
  /** Fixed below the scrolling content (e.g. a primary action); pads the bottom safe area. */
  footer?: ReactNode;
};

/**
 * Scrolling screen body for routes without a native header. Pads the top
 * safe area, applies the standard gutter and the vertical rhythm between
 * sections. Inside a tab navigator whose bar floats over content (patient
 * and staff tabs), it also pads by the bar's measured height plus room for
 * the raised centre button, and lifts a fixed footer (e.g. Call Next)
 * clear of the bar.
 */
/** Route groups whose tab bar floats over content (CradleTabBar). */
const FLOATING_TAB_GROUPS = ["(patient)", "staff"];

export function Screen({ children, header, footer }: ScreenProps): JSX.Element {
  const insets = useSafeAreaInsets();
  // Inside the patient/staff tabs the bar floats over content. Clear the
  // larger of its measured height and its full geometry (bar + safe area +
  // raised centre circle); detect the tabs from the route too, so padding
  // never depends on the context alone.
  const measuredTabBar = useContext(BottomTabBarHeightContext);
  const inCradleTabs = FLOATING_TAB_GROUPS.includes(useSegments()[0] ?? "");
  const tabBarClearance =
    measuredTabBar === undefined && !inCradleTabs
      ? 0
      : Math.max(measuredTabBar ?? 0, cradleTabBarClearance(insets.bottom));
  const [scrolled, setScrolled] = useState(false);

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {header ? (
        // Solid, layered above the scroll view; a hairline appears once content
        // scrolls beneath it so nothing looks sliced off.
        <View
          className={`z-10 border-b bg-background ${scrolled ? "border-separator" : "border-transparent"}`}
          style={{ paddingHorizontal: layout.screenGutter }}
        >
          {header}
        </View>
      ) : null}
      <ScrollView
        // With a fixed header the safe area is already handled above; don't add iOS automatic insets.
        contentInsetAdjustmentBehavior={header ? "never" : "automatic"}
        scrollEventThrottle={16}
        // Keep the scroll indicator above the floating bar too.
        scrollIndicatorInsets={{ bottom: tabBarClearance }}
        onScroll={
          header ? (event) => setScrolled(event.nativeEvent.contentOffset.y > 0) : undefined
        }
        contentContainerStyle={{
          paddingTop: spacing.md,
          // Bar clearance plus a small breathing space above it.
          paddingBottom: footer ? spacing.lg : tabBarClearance + spacing.lg,
          paddingHorizontal: layout.screenGutter,
          gap: layout.sectionGap,
        }}
      >
        {children}
      </ScrollView>
      {footer ? (
        <View
          className="bg-background pt-3"
          style={{
            paddingHorizontal: layout.screenGutter,
            // Above the floating bar (and its raised centre) when in tabs.
            paddingBottom:
              tabBarClearance > 0
                ? tabBarClearance + spacing.md
                : Math.max(insets.bottom, spacing.md),
          }}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}
