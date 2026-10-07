import { useRouter } from "expo-router";
import { Button, SearchField, Typography } from "heroui-native";
import { type JSX, useState } from "react";
import { Alert, View } from "react-native";

import {
  AdminRow,
  AdminSheet,
  confirmChange,
  EmptyState,
  type PillTone,
  SheetAction,
} from "@/components/admin/admin-ui";
import { LoadingState } from "@/components/feedback/loading-state";
import { FilterChips } from "@/components/ui/filter-chips";
import { FormField } from "@/components/ui/form-field";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { textRole } from "@/design-system";
import type { AdminMember } from "@/features/admin/admin";
import {
  useAdminActions,
  useAdminDoctors,
  useAdminInvites,
  useAdminMembers,
} from "@/features/admin/use-admin";
import { useSession } from "@/features/auth/session";
import { normalizeEmail } from "@/features/hospitals/hospital";
import { errorMessage } from "@/lib/app-error";

type Filter = "all" | "staff" | "doctor" | "admin" | "inactive";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "staff", label: "Staff" },
  { id: "doctor", label: "Doctors" },
  { id: "admin", label: "Admins" },
  { id: "inactive", label: "Inactive" },
];
const ROLE = { staff: "Staff", doctor: "Doctor", admin: "Admin" } as const;
const ROLE_TONE: Record<AdminMember["role"], PillTone> = {
  staff: "muted",
  doctor: "accent",
  admin: "success",
};

/**
 * Members and invitations. Admins invite by email (claimed when that person
 * signs in with the verified address), change roles and (de)activate,
 * never their own membership, so the hospital always keeps an admin.
 */
export default function AdminTeamRoute(): JSX.Element {
  const router = useRouter();
  const { user } = useSession();
  const members = useAdminMembers();
  const invites = useAdminInvites();
  const doctors = useAdminDoctors();
  const { repo, hospitalId } = useAdminActions();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<AdminMember | null>(null);
  const [inviting, setInviting] = useState(false);

  const needle = query.trim().toLowerCase();
  const rows = members.data.filter(
    (m) =>
      (filter === "inactive" ? !m.active : m.active && (filter === "all" || m.role === filter)) &&
      (!needle ||
        m.displayName.toLowerCase().includes(needle) ||
        m.email.toLowerCase().includes(needle))
  );
  const pending = invites.data.filter(
    (i) => i.status === "pending" && (!needle || i.email.includes(needle))
  );

  const save = (
    member: AdminMember,
    patch: { role?: "staff" | "admin"; active?: boolean }
  ): void => {
    setSelected(null);
    repo
      .updateMember(member.id, patch)
      .catch((error: unknown) => Alert.alert("Couldn't update", errorMessage(error)));
  };
  const name = (m: AdminMember): string => m.displayName || m.email;

  return (
    <Screen header={<ScreenHeader title="Team" onBack={() => router.back()} />}>
      <View className="gap-3">
        <SearchField value={query} onChange={setQuery}>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input
              placeholder="Search by name or email"
              accessibilityLabel="Search team"
              className="h-12 rounded-full border border-border bg-surface-secondary"
            />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <FilterChips options={FILTERS} selected={filter} onSelect={setFilter} />
      </View>

      {pending.length > 0 && filter !== "inactive" ? (
        <View className="gap-2">
          <Typography
            type={textRole.supporting.type}
            weight="semibold"
            color="muted"
            className="px-1"
          >
            Invited
          </Typography>
          {pending.map((invite) => (
            <AdminRow
              key={invite.id}
              icon="email-outline"
              title={invite.email}
              subtitle={
                invite.role === "doctor" ? `Doctor · ${invite.doctorName}` : ROLE[invite.role]
              }
              pill={{ label: "Pending", tone: "warning" }}
              onPress={() =>
                confirmChange(
                  "Cancel this invitation?",
                  `${invite.email} won't be able to join with it.`,
                  "Cancel invitation",
                  () => {
                    repo
                      .revokeInvite(invite.id)
                      .catch((error: unknown) =>
                        Alert.alert("Couldn't cancel", errorMessage(error))
                      );
                  }
                )
              }
            />
          ))}
        </View>
      ) : null}

      {members.status === "loading" ? (
        <LoadingState title="Loading team" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="account-search-outline"
          title={
            needle
              ? "No one matches"
              : filter === "inactive"
                ? "No inactive members"
                : "No members yet"
          }
          description={
            needle
              ? "Try another name or email."
              : "Invite staff and admins by email; they join when they sign in."
          }
          {...(needle
            ? {}
            : { action: { label: "Invite member", onPress: () => setInviting(true) } })}
        />
      ) : (
        <View className="gap-2">
          {rows.map((member) => {
            const self = member.userId === user?.id;
            const doctor = doctors.data.find((d) => d.id === member.doctorId);
            return (
              <AdminRow
                key={member.id}
                title={`${member.displayName || "(no name)"}${self ? " · you" : ""}`}
                subtitle={doctor ? `${doctor.name}` : member.email}
                pill={
                  member.active
                    ? { label: ROLE[member.role], tone: ROLE_TONE[member.role] }
                    : { label: "Inactive", tone: "muted" }
                }
                muted={!member.active}
                {...(self ? {} : { onPress: () => setSelected(member) })}
              />
            );
          })}
        </View>
      )}

      <PrimaryButton
        label="Invite member"
        icon="account-plus-outline"
        onPress={() => setInviting(true)}
      />
      <Typography type={textRole.caption.type} color="muted">
        Doctor logins are invited from each doctor&apos;s page. You can&apos;t change your own
        access, so the hospital always keeps an admin.
      </Typography>

      <AdminSheet
        isOpen={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? name(selected) : ""}
        description={
          selected ? `${ROLE[selected.role]} · ${selected.active ? "Active" : "Inactive"}` : ""
        }
      >
        {selected && selected.active && selected.role !== "doctor" ? (
          <SheetAction
            label={selected.role === "admin" ? "Make staff" : "Make admin"}
            description={
              selected.role === "admin"
                ? "Keeps queue access, removes admin settings"
                : "Can manage team, doctors, services and hospital"
            }
            onPress={() => {
              const member = selected;
              const next = member.role === "admin" ? "staff" : "admin";
              confirmChange(
                `Change ${name(member)} to ${ROLE[next]}?`,
                "Takes effect immediately.",
                "Change role",
                () => save(member, { role: next }),
                next === "staff"
              );
            }}
          />
        ) : null}
        {selected ? (
          selected.active ? (
            <SheetAction
              label="Deactivate"
              description="Removes their access to this hospital. History is kept."
              destructive
              onPress={() => {
                const member = selected;
                confirmChange(
                  `Deactivate ${name(member)}?`,
                  "They lose access to this hospital until reactivated.",
                  "Deactivate",
                  () => save(member, { active: false })
                );
              }}
            />
          ) : (
            <SheetAction
              label="Reactivate"
              description="Restores their previous role"
              onPress={() => save(selected, { active: true })}
            />
          )
        ) : null}
      </AdminSheet>

      <InviteSheet
        isOpen={inviting}
        onClose={() => setInviting(false)}
        onInvite={async (email, role) => {
          if (!hospitalId) return;
          const existing = invites.data.find((i) => i.email === normalizeEmail(email));
          await repo.invite(hospitalId, email, role, null, existing);
        }}
      />
    </Screen>
  );
}

/** Email + role (Staff/Admin). Doctors are invited from their doctor page. */
function InviteSheet({
  isOpen,
  onClose,
  onInvite,
}: {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (email: string, role: "staff" | "admin") => Promise<void>;
}): JSX.Element {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"staff" | "admin">("staff");
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const close = (): void => {
    setEmail("");
    setRole("staff");
    setState("idle");
    setError(null);
    onClose();
  };

  return (
    <AdminSheet
      isOpen={isOpen}
      onClose={close}
      title={state === "done" ? "Invitation created" : "Invite member"}
      description={
        state === "done"
          ? `Ask them to register (or sign in) to AfyaQueue with ${normalizeEmail(email)}. They'll be asked to verify the email, then join automatically.`
          : "They join this hospital when they sign in with this email."
      }
    >
      {state === "done" ? (
        <PrimaryButton label="Done" onPress={close} />
      ) : (
        <>
          <FormField
            label="Email"
            icon="email-outline"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setError(null);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="name@hospital.org"
            {...(error ? { error } : {})}
          />
          <SegmentedTabs
            segments={[
              { id: "staff", label: "Staff" },
              { id: "admin", label: "Admin" },
            ]}
            selected={role}
            onSelect={setRole}
          />
          <PrimaryButton
            label={state === "saving" ? "Inviting…" : "Send invitation"}
            onPress={() => {
              if (state === "saving") return;
              setState("saving");
              onInvite(email, role).then(
                () => setState("done"),
                (failure: unknown) => {
                  setState("idle");
                  setError(errorMessage(failure));
                }
              );
            }}
          />
          <Button variant="ghost" onPress={close}>
            Cancel
          </Button>
        </>
      )}
    </AdminSheet>
  );
}
