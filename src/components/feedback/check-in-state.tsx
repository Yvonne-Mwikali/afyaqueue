import type { JSX } from "react";
import { View } from "react-native";

import { LoadingState } from "./loading-state";
import { QueueWaitingState } from "./queue-waiting-state";
import { SuccessState } from "./success-state";

type CheckInStateProps =
  { status: "processing" } | { status: "success"; queueNumber: number; queueStatus: string };

/**
 * Check-in feedback, ready for the Check In flow: rings around a location
 * check while arrival is confirmed, then a brief success mark that hands
 * over to the live queue number.
 */
export function CheckInState(props: CheckInStateProps): JSX.Element {
  if (props.status === "processing") {
    return (
      <LoadingState
        icon="map-marker-check-outline"
        title="Checking you in"
        message="Confirming your arrival and preparing your queue position."
      />
    );
  }

  return (
    <SuccessState title="You're checked in" message="You're now in the queue.">
      <View className="pt-4">
        <QueueWaitingState queueNumber={props.queueNumber} status={props.queueStatus} />
      </View>
    </SuccessState>
  );
}
