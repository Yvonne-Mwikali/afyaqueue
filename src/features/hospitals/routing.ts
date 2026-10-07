import { type HospitalMembership, workspaceFor } from "./hospital";

export type Destination =
  | { kind: "gate"; state: "pending" | "unsupported" | "error"; message?: string }
  | { kind: "choose-workspace" }
  | { kind: "choose-hospital" }
  | { kind: "invite" }
  | { kind: "area"; area: "patient" | "staff" | "doctor" };

type RoutingInput = {
  profileStatus: "loading" | "ready" | "missing" | "error";
  hospitalStatus: "loading" | "ready" | "error";
  /** Context in use: patient, a professional workspace, or "choose". */
  mode: "patient" | "member" | "choose";
  workspace: HospitalMembership | null;
  hospitalCount: number;
  hasPatientHospital: boolean;
  /** Pending, not-dismissed invitations for this account. */
  pendingInvites: number;
};

/**
 * Where a signed-in user goes. Patient mode is open to every account;
 * professional workspaces come from active hospital memberships. The
 * context provider restores the last valid choice; when it can't, the
 * user picks. Nothing is guessed.
 */
export function destinationFor(input: RoutingInput): Destination {
  if (input.profileStatus === "error" || input.hospitalStatus === "error") {
    return { kind: "gate", state: "error" };
  }
  if (input.profileStatus !== "ready" || input.hospitalStatus === "loading") {
    return { kind: "gate", state: "pending" };
  }
  // An invitation is offered before anything else (they can choose "Not now").
  if (input.pendingInvites > 0) return { kind: "invite" };
  if (input.mode === "choose") return { kind: "choose-workspace" };
  if (input.mode === "member") {
    return input.workspace
      ? { kind: "area", area: workspaceFor(input.workspace.role) }
      : { kind: "choose-workspace" };
  }
  if (input.hasPatientHospital) return { kind: "area", area: "patient" };
  return input.hospitalCount > 0
    ? { kind: "choose-hospital" }
    : { kind: "gate", state: "unsupported", message: "No hospitals are available right now." };
}
