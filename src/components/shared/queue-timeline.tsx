import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Typography, useThemeColor } from "heroui-native";
import { Fragment, type JSX } from "react";
import { View } from "react-native";

import { textRole } from "@/design-system";

type TimelineProps = {
  nowServing: number;
  queueNumber: number;
};

type Node = { number: number; caption: string; state: "done" | "current" | "you" | "upcoming" };

/**
 * Four evenly spaced milestones: the last patient served, who is being
 * served now, the patient's own number, and the next after them. Spacing is
 * deliberately even: it shows order, not precise distance.
 */
export function QueueTimeline({ nowServing, queueNumber }: TimelineProps): JSX.Element {
  const onAccent = useThemeColor("accent-foreground");
  const isYou = nowServing >= queueNumber;
  const nodes: Node[] = isYou
    ? [
        { number: nowServing - 1, caption: "Completed", state: "done" },
        { number: queueNumber, caption: "You", state: "you" },
        { number: queueNumber + 1, caption: "Upcoming", state: "upcoming" },
      ]
    : [
        { number: nowServing - 1, caption: "Completed", state: "done" },
        { number: nowServing, caption: "Now serving", state: "current" },
        { number: queueNumber, caption: "Your turn", state: "you" },
        { number: queueNumber + 1, caption: "Upcoming", state: "upcoming" },
      ];

  return (
    <View
      className="flex-row items-start"
      accessible
      accessibilityLabel={`Now serving ${nowServing}. Your number is ${queueNumber}.`}
    >
      {nodes.map((node, index) => {
        const reached = node.state === "done" || node.state === "current";
        return (
          <Fragment key={node.number}>
            {index > 0 ? (
              <View
                className={`mt-2.5 h-0.5 flex-1 rounded-full ${
                  node.state === "current" || node.state === "done"
                    ? "bg-brand-vivid"
                    : node.state === "you"
                      ? "bg-brand-vivid/40"
                      : "bg-separator"
                }`}
              />
            ) : null}
            <View className="w-16 items-center gap-0.5">
              <View
                className={`size-5.5 items-center justify-center rounded-full ${
                  node.state === "done"
                    ? "bg-accent"
                    : node.state === "current"
                      ? "border-4 border-brand-vivid/30 bg-brand-vivid"
                      : node.state === "you"
                        ? "border-2 border-brand-vivid bg-surface"
                        : "border-2 border-separator bg-surface"
                }`}
              >
                {node.state === "done" ? (
                  <MaterialCommunityIcons name="check" size={12} color={onAccent} />
                ) : null}
              </View>
              <Typography
                type={textRole.caption.type}
                weight="bold"
                className={reached || node.state === "you" ? "text-brand-text" : "text-muted"}
              >
                #{node.number}
              </Typography>
              <Typography
                type={textRole.micro.type}
                color="muted"
                className={`${textRole.micro.className} opacity-80`}
              >
                {node.caption}
              </Typography>
            </View>
          </Fragment>
        );
      })}
    </View>
  );
}
