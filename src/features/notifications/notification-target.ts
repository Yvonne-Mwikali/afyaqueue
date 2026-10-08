import type { Href } from "expo-router";

import type { AppNotification } from "./notification";

/** Where tapping a notification goes, for the area the user is in. */
export function notificationTarget(
  notification: Pick<AppNotification, "type" | "relatedAppointmentId">,
  area: "patient" | "staff" | "doctor"
): Href | null {
  switch (notification.type) {
    case "queue-called":
    case "queue-called-again":
    case "queue-held":
    case "queue-resumed":
      return area === "patient" ? "/queue" : null;
    case "appointment-booked":
    case "appointment-affected":
      return area === "patient" && notification.relatedAppointmentId
        ? {
            pathname: "/appointments/[appointmentId]",
            params: { appointmentId: notification.relatedAppointmentId },
          }
        : null;
    case "patient-checked-in":
      return area === "doctor" ? "/doctor/queue" : null;
  }
}
