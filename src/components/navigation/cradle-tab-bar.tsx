import { MaterialCommunityIcons } from "@expo/vector-icons";
import MaskedView from "@react-native-masked-view/masked-view";
import { BlurView } from "expo-blur";
import { BottomTabBarHeightCallbackContext, type BottomTabBarProps } from "expo-router/tabs";
import { PressableFeedback, Typography, useThemeColor } from "heroui-native";
import { type JSX, useContext, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedProps,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { useUniwind } from "uniwind";

import type { IconName } from "@/components/ui/icon-tile";
import {
  duration,
  easing,
  elevation,
  spacing,
  spring,
  textRole,
  useBrandColor,
} from "@/design-system";

export type CradleTabItem = {
  label: string;
  icon: IconName;
  activeIcon: IconName;
};

type CradleTabBarProps = BottomTabBarProps & {
  /** Regular tabs, keyed by route name, in left-to-right order. */
  items: Record<string, CradleTabItem>;
  /** Route rendered as the raised centre circle (patient "contact", staff "queue"). */
  center: { routeName: string; label: string; icon: IconName };
  /**
   * Share of each side's width per tab, outer → inner. Defaults to more
   * room for the inner tab; pass equal weights when labels are similar.
   */
  sideWeights?: readonly number[];
  /**
   * "corner" (patient): the outermost tabs' indicator runs into the bar's
   * rounded corners. "edge": every tab gets a short segment on the top edge.
   */
  indicator?: "corner" | "edge";
  /** Show the centre route's label under the circle, in line with the other labels. */
  centerLabel?: boolean;
  /** "double" (patient): bordered ring + halo. "single": one soft halo only. */
  centerRing?: "double" | "single";
};

/*
 * Geometry (dp), measured from assets/Design/patient-bottom-navigation-reference.png.
 * The contour is derived from the bar's measured width, so it holds on any phone.
 */
const BAR_HEIGHT = 64;
const BAR_RADIUS = 28;
const CENTER_SIZE = 60;
/** The centre circle's outer ring extends this far beyond the circle. */
const CENTER_RING_INSET = 4;
/** The circle's centre sits this far below the bar's top edge. */
const CRADLE_SINK = 10;
/** Gap between the circle and the cradle (U) around it. */
const CRADLE_GAP = 8;
const CRADLE_RADIUS = CENTER_SIZE / 2 + CRADLE_GAP;
/** Horizontal distance from centre where the top edge starts curving down. */
const CRADLE_SHOULDER = CRADLE_RADIUS + 12;
/**
 * Share of each side's width per tab, outer → inner. Inner tabs
 * (e.g. Appointments, Queue / Patients, Services) get more room so their
 * labels never truncate.
 */
const SIDE_TAB_WEIGHTS = [0.42, 0.58];
/** Inset of an inner tab's border stretch from its slot edges. */
const TAB_LINE_INSET = 10;
const INDICATOR_THICKNESS = 3.5;
const TAB_ICON_SIZE = 24;

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Geometry = { width: number; height: number; cx: number };

/** Gap below the floating bar: just above the home indicator, or 12dp without one. */
function barBottomOffset(bottomInset: number): number {
  return Math.max(bottomInset - spacing.sm, spacing.md);
}

/** How far the centre circle (with its ring) rises above the bar's top edge. */
function centerProtrusion(): number {
  return -(CRADLE_SINK - CENTER_SIZE / 2 - CENTER_RING_INSET);
}

/**
 * Distance from the bottom of the screen to the top of the floating patient
 * tab bar's tallest element (the raised centre circle): bar height, the gap
 * above the safe area, and the circle's protrusion. Screens pad their scroll
 * content by at least this much so nothing ends up behind the bar.
 */
export function cradleTabBarClearance(bottomInset: number): number {
  return BAR_HEIGHT + barBottomOffset(bottomInset) + centerProtrusion();
}
/** A tab's horizontal slot within the bar. */
type TabSlot = { x: number; width: number };

/** Bar outline: rounded rectangle whose top edge dips into a U cradle. */
function barPath({ width, height, cx }: Geometry): string {
  const r = BAR_RADIUS;
  const cy = CRADLE_SINK;
  const R = CRADLE_RADIUS;
  const s = CRADLE_SHOULDER;

  return [
    `M ${r} 0`,
    `L ${cx - s} 0`,
    // Shoulder: leaves the top edge horizontally, meets the cradle vertically.
    `C ${cx - s + 12} 0 ${cx - R} ${cy - 6} ${cx - R} ${cy}`,
    // Cradle: half circle concentric with the centre button.
    `A ${R} ${R} 0 0 0 ${cx} ${cy + R}`,
    `A ${R} ${R} 0 0 0 ${cx + R} ${cy}`,
    `C ${cx + R} ${cy - 6} ${cx + s - 12} 0 ${cx + s} 0`,
    `L ${width - r} 0`,
    `A ${r} ${r} 0 0 1 ${width} ${r}`,
    `L ${width} ${height - r}`,
    `A ${r} ${r} 0 0 1 ${width - r} ${height}`,
    `L ${r} ${height}`,
    `A ${r} ${r} 0 0 1 0 ${height - r}`,
    `L 0 ${r}`,
    `A ${r} ${r} 0 0 1 ${r} 0`,
    "Z",
  ].join(" ");
}

/**
 * AfyaQueue bottom navigation: a floating bar with a continuous curved top
 * contour that cradles a raised centre circle. Shared by the patient app
 * (Contact in the centre) and the staff app (Queue in the centre); each
 * passes its own routes. Navigation state comes entirely from Expo Router
 * (state/descriptors/navigation).
 */
export function CradleTabBar({
  state,
  navigation,
  insets,
  items,
  center,
  sideWeights = SIDE_TAB_WEIGHTS,
  indicator = "corner",
  centerLabel = false,
  centerRing = "double",
}: CradleTabBarProps): JSX.Element {
  const [width, setWidth] = useState(0);
  const reportHeight = useContext(BottomTabBarHeightCallbackContext);

  const tabs = state.routes
    .map((route, index) => ({ route, index, item: items[route.name] }))
    .filter((tab): tab is typeof tab & { item: CradleTabItem } => tab.item !== undefined);
  const leftTabs = tabs.slice(0, Math.ceil(tabs.length / 2));
  const rightTabs = tabs.slice(leftTabs.length);
  const centerIndex = state.routes.findIndex((route) => route.name === center.routeName);

  const geometry: Geometry = { width, height: BAR_HEIGHT, cx: width / 2 };

  // Slots per side: weighted outer → inner (mirrored on the right).
  const sideWidth = width / 2 - CRADLE_SHOULDER;
  const weightFor = (position: number, count: number): number =>
    count === sideWeights.length ? (sideWeights[position] ?? 0) : 1 / count;
  const slots = new Map<number, TabSlot>();
  const placeSide = (sideTabs: typeof tabs, start: number, mirrored: boolean): void => {
    let cursor = start;
    sideTabs.forEach((tab, i) => {
      const outerToInner = mirrored ? sideTabs.length - 1 - i : i;
      const slotWidth = sideWidth * weightFor(outerToInner, sideTabs.length);
      slots.set(tab.index, { x: cursor + slotWidth / 2, width: slotWidth });
      cursor += slotWidth;
    });
  };
  placeSide(leftTabs, 0, false);
  placeSide(rightTabs, width / 2 + CRADLE_SHOULDER, true);

  const navigate = (index: number): void => {
    const route = state.routes[index];
    if (!route) return;
    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (state.index !== index && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  const renderTab = ({ route, index, item }: (typeof tabs)[number]): JSX.Element => (
    <TabButton
      key={route.key}
      item={item}
      width={slots.get(index)?.width ?? 0}
      focused={state.index === index}
      onPress={() => navigate(index)}
    />
  );

  return (
    // Floats above the bottom safe area with side margins; content scrolls behind it.
    <View
      pointerEvents="box-none"
      className="absolute bottom-0 left-0 right-0 px-4"
      style={{ paddingBottom: barBottomOffset(insets.bottom) }}
      onLayout={(event) => reportHeight?.(event.nativeEvent.layout.height)}
    >
      <View
        style={{ height: BAR_HEIGHT }}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      >
        {/* Soft floating shadow; the visible outline is drawn in SVG. */}
        <View
          pointerEvents="none"
          className={elevation.overlay}
          style={[StyleSheet.absoluteFill, { borderRadius: BAR_RADIUS }]}
        />
        {width > 0 ? (
          <BarSurface
            geometry={geometry}
            slots={[...slots.entries()]}
            activeIndex={state.index}
            onCenter={state.index === centerIndex}
            edgeOnly={indicator === "edge"}
          />
        ) : null}
        <View className="flex-row" style={{ height: BAR_HEIGHT }}>
          {leftTabs.map(renderTab)}
          {centerLabel ? (
            <CenterLabel
              label={center.label}
              focused={state.index === centerIndex}
              onPress={() => navigate(centerIndex)}
            />
          ) : (
            <View style={{ width: CRADLE_SHOULDER * 2 }} />
          )}
          {rightTabs.map(renderTab)}
        </View>
        <CenterButton
          label={center.label}
          icon={center.icon}
          focused={state.index === centerIndex}
          ring={centerRing}
          onPress={() => navigate(centerIndex)}
        />
      </View>
    </View>
  );
}

/** Samples per quarter corner, shoulder and U half-turn when building the border track. */
const U_SAMPLES = 60;

/**
 * The bar's border as a sampled polyline. It starts at the left corner and
 * runs along the top edge (down through the U cradle) to the right corner;
 * then continues around the bottom edge back to the start, and repeats the
 * top once more so a trip that wraps past the start stays continuous.
 * Points sit just inside the outline so the indicator reads as the border
 * itself. `s` is the distance along the track.
 */
type Track = {
  xs: number[];
  ys: number[];
  ss: number[];
  /** Length of the top border (left corner → right corner). */
  length: number;
  /** Length of one full lap (top + bottom), where the top repeats. */
  loopLength: number;
  /** Last sample of the first top pass. */
  topEnd: number;
  /** Index of the sample where the U begins (left side, level with its centre). */
  uStart: number;
  uEnd: number;
};

function buildTrack({ width, height, cx }: Geometry): Track {
  const r = BAR_RADIUS;
  const R = CRADLE_RADIUS;
  const cy = CRADLE_SINK;
  const sh = CRADLE_SHOULDER;
  const pts: [number, number][] = [];
  const arc = (
    ox: number,
    oy: number,
    rad: number,
    a0: number,
    a1: number,
    n: number,
    first = false
  ): void => {
    for (let i = first ? 0 : 1; i <= n; i++) {
      const t = a0 + ((a1 - a0) * i) / n;
      pts.push([ox + rad * Math.cos(t), oy + rad * Math.sin(t)]);
    }
  };
  const line = (x1: number, y1: number, n: number): void => {
    const [x0, y0] = pts[pts.length - 1] ?? [x1, y1];
    for (let i = 1; i <= n; i++) pts.push([x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]);
  };
  const cubic = (
    p1: [number, number],
    p2: [number, number],
    p3: [number, number],
    n: number
  ): void => {
    const [x0, y0] = pts[pts.length - 1] ?? p3;
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const u = 1 - t;
      pts.push([
        u * u * u * x0 + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * y0 + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
      ]);
    }
  };

  arc(r, r, r, Math.PI, 1.5 * Math.PI, 12, true); // top-left corner
  line(cx - sh, 0, 24);
  cubic([cx - sh + 12, 0], [cx - R, cy - 6], [cx - R, cy], 20); // left shoulder
  const uStart = pts.length - 1;
  arc(cx, cy, R, Math.PI, 0, U_SAMPLES); // the U, through its bottom
  const uEnd = pts.length - 1;
  cubic([cx + R, cy - 6], [cx + sh - 12, 0], [cx + sh, 0], 20); // right shoulder
  line(width - r, 0, 24);
  arc(width - r, r, r, 1.5 * Math.PI, 2 * Math.PI, 12); // top-right corner
  const topEnd = pts.length - 1;
  // Bottom lap: down the right side, along the bottom, up the left side.
  line(width, height - r, 16);
  arc(width - r, height - r, r, 0, 0.5 * Math.PI, 12);
  line(r, height, 40);
  arc(r, height - r, r, 0.5 * Math.PI, Math.PI, 12);
  line(0, r, 16);
  const loopEnd = pts.length - 1;
  // The top again, so positions just past one lap are still on the track.
  pts.push(...pts.slice(1, topEnd + 1));

  // Offset each point inward by half the stroke so the line sits on the border.
  const inset = INDICATOR_THICKNESS / 2 + 0.5;
  const xs: number[] = [];
  const ys: number[] = [];
  pts.forEach(([x, y], i) => {
    const [px, py] = pts[Math.max(i - 1, 0)] ?? [x, y];
    const [nx, ny] = pts[Math.min(i + 1, pts.length - 1)] ?? [x, y];
    const len = Math.hypot(nx - px, ny - py) || 1;
    xs.push(x + (-(ny - py) / len) * inset);
    ys.push(y + ((nx - px) / len) * inset);
  });
  const ss = [0];
  for (let i = 1; i < xs.length; i++) {
    ss.push(
      (ss[i - 1] ?? 0) +
        Math.hypot((xs[i] ?? 0) - (xs[i - 1] ?? 0), (ys[i] ?? 0) - (ys[i - 1] ?? 0))
    );
  }
  return {
    xs,
    ys,
    ss,
    length: ss[topEnd] ?? 0,
    loopLength: ss[loopEnd] ?? 0,
    topEnd,
    uStart,
    uEnd,
  };
}

/** Distance along the track where it reaches x, searching samples [from, to]. */
function distanceAtX(track: Track, x: number, from: number, to: number): number {
  for (let i = from; i < to; i++) {
    const x0 = track.xs[i] ?? 0;
    const x1 = track.xs[i + 1] ?? 0;
    if (x >= x0 && x <= x1) {
      const k = x1 === x0 ? 0 : (x - x0) / (x1 - x0);
      return (track.ss[i] ?? 0) + k * ((track.ss[i + 1] ?? 0) - (track.ss[i] ?? 0));
    }
  }
  return x < (track.xs[from] ?? 0) ? (track.ss[from] ?? 0) : (track.ss[to] ?? 0);
}

/**
 * The stretch of border each destination owns: tabs cover their slot (the
 * outermost tabs run into the corners), the centre route covers the whole U.
 */
function indicatorRange(
  track: Track,
  slots: [number, TabSlot][],
  cx: number,
  activeIndex: number,
  onCenter: boolean,
  /** Short top-edge segments for every tab, never running into the corners. */
  edgeOnly = false
): [number, number] | null {
  if (onCenter) {
    // The full depth of the U, from where it leaves the left side to the right.
    return [track.ss[track.uStart] ?? 0, track.ss[track.uEnd] ?? 0];
  }
  const slot = slots.find(([index]) => index === activeIndex)?.[1];
  if (!slot) return null;
  const xs = slots.map(([, s]) => s.x);
  const isFirst = !edgeOnly && slot.x === Math.min(...xs);
  const isLast = !edgeOnly && slot.x === Math.max(...xs);
  const left = slot.x < cx;
  const [from, to] = left ? [0, track.uStart] : [track.uEnd, track.topEnd];
  const start = isFirst
    ? 0
    : distanceAtX(track, slot.x - slot.width / 2 + TAB_LINE_INSET, from, to);
  const end = isLast
    ? track.length
    : distanceAtX(track, slot.x + slot.width / 2 - TAB_LINE_INSET, from, to);
  return [start, end];
}

/**
 * Bar fill and hairline outline from one SVG contour, plus the border
 * indicator. iOS adds a backdrop blur clipped to the same contour.
 */
function BarSurface({
  geometry,
  slots,
  activeIndex,
  onCenter,
  edgeOnly,
}: {
  geometry: Geometry;
  slots: [number, TabSlot][];
  activeIndex: number;
  onCenter: boolean;
  edgeOnly: boolean;
}): JSX.Element {
  const [surface, border] = useThemeColor(["surface", "border"]);
  const { theme } = useUniwind();
  const { width, height } = geometry;
  const outline = barPath(geometry);
  const track = buildTrack(geometry);
  const range = indicatorRange(track, slots, geometry.cx, activeIndex, onCenter, edgeOnly);
  // First and last tabs (by position) for the last → first bottom-border trip.
  const byPosition = [...slots].sort(([, a], [, b]) => a.x - b.x);
  const firstIndex = byPosition[0]?.[0];
  const lastIndex = byPosition[byPosition.length - 1]?.[0];
  const firstRange =
    firstIndex === undefined
      ? null
      : indicatorRange(track, slots, geometry.cx, firstIndex, false, edgeOnly);
  const lastRange =
    lastIndex === undefined
      ? null
      : indicatorRange(track, slots, geometry.cx, lastIndex, false, edgeOnly);
  const isIOS = Platform.OS === "ios";

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {isIOS ? (
        <MaskedView
          style={StyleSheet.absoluteFill}
          maskElement={
            <Svg width={width} height={height}>
              <Path d={outline} fill="black" />
            </Svg>
          }
        >
          <BlurView
            intensity={40}
            // Match the blur material to the active theme.
            tint={theme === "dark" ? "systemChromeMaterialDark" : "systemChromeMaterialLight"}
            style={StyleSheet.absoluteFill}
          />
        </MaskedView>
      ) : null}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Path
          d={outline}
          fill={surface}
          fillOpacity={isIOS ? 0.7 : 0.96}
          stroke={border}
          strokeWidth={1}
        />
        <BorderIndicator
          track={track}
          range={range}
          firstRange={firstRange}
          lastRange={lastRange}
        />
      </Svg>
    </View>
  );
}

/** Overlapping layers that build the fading tail; more layers = smoother fade. */
const TAIL_LAYERS = 6;
const TAIL_LAYER_OPACITY = 0.45;
/** Share of the line, from its trailing end, that fades out. */
const TAIL_FADE = 0.75;

/** SVG path for the stretch of the track between distances `from` and `to`. */
function trackSubpath(xs: number[], ys: number[], ss: number[], from: number, to: number): string {
  "worklet";
  const pointAt = (dist: number): string => {
    for (let i = 0; i < ss.length - 1; i++) {
      const s0 = ss[i] ?? 0;
      const s1 = ss[i + 1] ?? 0;
      if (dist <= s1) {
        const k = s1 === s0 ? 0 : (dist - s0) / (s1 - s0);
        const x0 = xs[i] ?? 0;
        const y0 = ys[i] ?? 0;
        return `${x0 + k * ((xs[i + 1] ?? 0) - x0)} ${y0 + k * ((ys[i + 1] ?? 0) - y0)}`;
      }
    }
    return `${xs[xs.length - 1] ?? 0} ${ys[ys.length - 1] ?? 0}`;
  };
  let d = `M ${pointAt(from)}`;
  for (let i = 0; i < ss.length; i++) {
    const si = ss[i] ?? 0;
    if (si > from && si < to) d += ` L ${xs[i] ?? 0} ${ys[i] ?? 0}`;
  }
  return `${d} L ${pointAt(to)}`;
}

/**
 * An orange stroke that slithers along the bar's border with a fading tail.
 * Moving to another tab, the leading end runs ahead along the border
 * (through corners and the U) and the trailing end follows a beat later, so
 * the line stretches and then settles over the new destination. The tail
 * always fades on the side it came from.
 */
function BorderIndicator({
  track,
  range,
  firstRange,
  lastRange,
}: {
  track: Track;
  range: [number, number] | null;
  /** First and last tabs' stretches: last → first travels along the bottom border. */
  firstRange: [number, number] | null;
  lastRange: [number, number] | null;
}): JSX.Element {
  const vivid = useBrandColor("brand-vivid");
  const reduceMotion = useReducedMotion();
  const [startTarget, endTarget] = range ?? [0, 0];
  const tail = useSharedValue(startTarget);
  const head = useSharedValue(endTarget);
  /** +1 when the line last travelled forward along the track, -1 backward. */
  const direction = useSharedValue(1);
  const visible = useSharedValue(range ? 1 : 0);
  const trackLength = track.length;
  const loopLength = track.loopLength;
  const measured = useRef(trackLength);
  const [firstStart, firstEnd] = firstRange ?? [-1, -1];
  const [lastStart, lastEnd] = lastRange ?? [-1, -1];

  useEffect(() => {
    visible.set(withTiming(range ? 1 : 0, { duration: duration.fast }));
    if (!range) return;
    const remeasured = measured.current !== trackLength;
    measured.current = trackLength;
    if (reduceMotion || remeasured) {
      tail.set(startTarget);
      head.set(endTarget);
      return;
    }
    const lead = { duration: duration.base, easing: easing.standard };
    const follow = { duration: duration.slow, easing: easing.standard };

    // Last tab → first tab: keep going forward around the bottom border
    // (one lap), then snap back to the equivalent position on the first lap.
    const near = (a: number, b: number): boolean => Math.abs(a - b) < 1;
    const fromLast = near(tail.get(), lastStart) && near(head.get(), lastEnd);
    const toFirst = near(startTarget, firstStart) && near(endTarget, firstEnd);
    if (fromLast && toFirst) {
      direction.set(1);
      head.set(withTiming(loopLength + endTarget, follow));
      tail.set(
        withDelay(
          duration.fast / 2,
          withTiming(loopLength + startTarget, follow, (finished) => {
            if (finished) {
              tail.set(startTarget);
              head.set(endTarget);
            }
          })
        )
      );
      return;
    }

    const forward = startTarget > tail.get();
    direction.set(forward ? 1 : -1);
    // The end facing the direction of travel leads; the other trails behind.
    if (forward) {
      head.set(withTiming(endTarget, lead));
      tail.set(withDelay(duration.fast / 2, withTiming(startTarget, follow)));
    } else {
      tail.set(withTiming(startTarget, lead));
      head.set(withDelay(duration.fast / 2, withTiming(endTarget, follow)));
    }
  }, [
    startTarget,
    endTarget,
    range,
    reduceMotion,
    trackLength,
    loopLength,
    firstStart,
    firstEnd,
    lastStart,
    lastEnd,
    tail,
    head,
    direction,
    visible,
  ]);

  const layerProps = { track, tail, head, direction, visible, color: vivid };

  return (
    <>
      {/* Soft glow on the bright front half only. */}
      <TailLayer {...layerProps} cut={0.5} strokeWidth={INDICATOR_THICKNESS * 2.5} opacity={0.18} />
      {Array.from({ length: TAIL_LAYERS }, (_, layer) => (
        <TailLayer
          key={layer}
          {...layerProps}
          cut={(TAIL_FADE * layer) / TAIL_LAYERS}
          strokeWidth={INDICATOR_THICKNESS}
          opacity={TAIL_LAYER_OPACITY}
        />
      ))}
    </>
  );
}

/**
 * One translucent copy of the indicator with `cut` (a fraction of its length)
 * trimmed from the trailing end. Stacked, the copies are solid at the head
 * and fade toward the tail.
 */
function TailLayer({
  track,
  tail,
  head,
  direction,
  visible,
  color,
  cut,
  strokeWidth,
  opacity,
}: {
  track: Track;
  tail: SharedValue<number>;
  head: SharedValue<number>;
  direction: SharedValue<number>;
  visible: SharedValue<number>;
  color: string;
  cut: number;
  strokeWidth: number;
  opacity: number;
}): JSX.Element {
  const { xs, ys, ss } = track;
  const animatedProps = useAnimatedProps(() => {
    const a = Math.min(tail.get(), head.get());
    const b = Math.max(tail.get(), head.get());
    const trim = cut * (b - a);
    const from = direction.get() > 0 ? a + trim : a;
    const to = direction.get() > 0 ? b : b - trim;
    return { d: trackSubpath(xs, ys, ss, from, to), strokeOpacity: opacity * visible.get() };
  });

  return (
    <AnimatedPath
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      animatedProps={animatedProps}
    />
  );
}

function TabButton({
  item,
  width,
  focused,
  onPress,
}: {
  item: CradleTabItem;
  width: number;
  focused: boolean;
  onPress: () => void;
}): JSX.Element {
  const muted = useThemeColor("muted");
  const vivid = useBrandColor("brand-vivid");
  const reduceMotion = useReducedMotion();
  const lift = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    lift.set(reduceMotion ? (focused ? 1 : 0) : withSpring(focused ? 1 : 0, spring.snappy));
  }, [focused, reduceMotion, lift]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -2 * lift.get() }, { scale: 1 + 0.08 * lift.get() }],
  }));

  return (
    <PressableFeedback
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: focused }}
      // pt-1.5 gives the icon breathing room below the top-edge indicator.
      className="min-h-12 items-center justify-center gap-0.5 pt-1.5"
      style={{ width }}
    >
      <Animated.View style={iconStyle}>
        <MaterialCommunityIcons
          name={focused ? item.activeIcon : item.icon}
          size={TAB_ICON_SIZE}
          color={focused ? vivid : muted}
        />
      </Animated.View>
      <Typography
        type={textRole.caption.type}
        weight={focused ? "bold" : "medium"}
        numberOfLines={1}
        // Safety net for large system text: shrink rather than clip.
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        className={focused ? "text-brand-text" : "text-muted"}
      >
        {item.label}
      </Typography>
    </PressableFeedback>
  );
}

/** 60dp orange circle sitting in the cradle; always orange, active state is the arc. */
function CenterButton({
  label,
  icon,
  focused,
  ring,
  onPress,
}: {
  label: string;
  icon: IconName;
  focused: boolean;
  ring: "double" | "single";
  onPress: () => void;
}): JSX.Element {
  const foreground = useThemeColor("accent-foreground");

  return (
    <View
      pointerEvents="box-none"
      className="absolute left-0 right-0 items-center"
      style={{ top: CRADLE_SINK - CENTER_SIZE / 2 - CENTER_RING_INSET }}
    >
      {/* Subtle outer ring around the circle ("single": one soft halo, no border). */}
      <View
        pointerEvents="box-none"
        className={`size-17 items-center justify-center rounded-full ${
          ring === "double" ? "border border-brand-vivid/30 bg-brand-vivid/10" : "bg-brand-vivid/8"
        }`}
      >
        <PressableFeedback
          onPress={onPress}
          accessibilityRole="tab"
          accessibilityLabel={label}
          accessibilityState={{ selected: focused }}
          className={`size-15 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-brand-vivid to-cta-from ${elevation.cta}`}
        >
          <MaterialCommunityIcons name={icon} size={26} color={foreground} />
        </PressableFeedback>
      </View>
    </View>
  );
}

/**
 * The centre route's label, in the slot under the circle and laid out like
 * a regular tab (icon-height spacer + label) so all labels share a line.
 * Pressing it opens the centre route too; screen readers use the circle.
 */
function CenterLabel({
  label,
  focused,
  onPress,
}: {
  label: string;
  focused: boolean;
  onPress: () => void;
}): JSX.Element {
  return (
    <PressableFeedback
      onPress={onPress}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      className="min-h-12 items-center justify-center gap-0.5 pt-1.5"
      style={{ width: CRADLE_SHOULDER * 2 }}
    >
      <View style={{ height: TAB_ICON_SIZE }} />
      <Typography
        type={textRole.caption.type}
        weight={focused ? "bold" : "medium"}
        numberOfLines={1}
        className={focused ? "text-brand-text" : "text-muted"}
      >
        {label}
      </Typography>
    </PressableFeedback>
  );
}
