import { useRouter } from "expo-router";
import type { JSX } from "react";
import { useState } from "react";
import { View } from "react-native";

import { AdminRow, EmptyState, type PillTone } from "@/components/admin/admin-ui";
import { LoadingState } from "@/components/feedback/loading-state";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { ACCOUNT_LABEL, accountStatus } from "@/features/admin/doctor-status";
import {
  useAdminDoctors,
  useAdminInvites,
  useAdminLinks,
  useAdminServices,
} from "@/features/admin/use-admin";

const TONE: Record<keyof typeof ACCOUNT_LABEL, PillTone> = {
  linked: "success",
  pending: "warning",
  none: "muted",
};

/** The hospital's doctors, with services and login status. Accounts are optional. */
export default function AdminDoctorsRoute(): JSX.Element {
  const router = useRouter();
  const doctors = useAdminDoctors();
  const links = useAdminLinks();
  const services = useAdminServices();
  const invites = useAdminInvites();
  const [tab, setTab] = useState<"active" | "inactive">("active");
  const rows = doctors.data.filter((d) => (tab === "active" ? d.active : !d.active));
  const serviceNames = (doctorId: string): string =>
    links.data
      .filter((l) => l.doctorId === doctorId && l.active)
      .map((l) => services.data.find((s) => s.id === l.serviceId)?.name)
      .filter(Boolean)
      .join(", ");
  const add = (): void => router.push("/admin/doctors/new");

  return (
    <Screen header={<ScreenHeader title="Doctors" onBack={() => router.back()} />}>
      <SegmentedTabs
        segments={[
          { id: "active", label: "Active", count: doctors.data.filter((d) => d.active).length },
          {
            id: "inactive",
            label: "Inactive",
            count: doctors.data.filter((d) => !d.active).length,
          },
        ]}
        selected={tab}
        onSelect={setTab}
      />
      {doctors.status === "loading" ? (
        <LoadingState title="Loading doctors" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="doctor"
          title={tab === "active" ? "No doctors yet" : "No inactive doctors"}
          description={
            tab === "active"
              ? "Add a doctor, assign services and hours. Inviting their login is optional."
              : "Deactivated doctors appear here and can be reactivated."
          }
          {...(tab === "active" ? { action: { label: "Add doctor", onPress: add } } : {})}
        />
      ) : (
        <View className="gap-2">
          {rows.map((doctor) => {
            const status = accountStatus(doctor, invites.data);
            return (
              <AdminRow
                key={doctor.id}
                icon="doctor"
                title={doctor.name}
                subtitle={doctor.specialty}
                detail={serviceNames(doctor.id) || "No services yet"}
                pill={{ label: ACCOUNT_LABEL[status.kind], tone: TONE[status.kind] }}
                muted={!doctor.active}
                onPress={() =>
                  router.push({
                    pathname: "/admin/doctors/[doctorId]",
                    params: { doctorId: doctor.id },
                  })
                }
              />
            );
          })}
        </View>
      )}
      <PrimaryButton label="Add doctor" icon="account-plus-outline" onPress={add} />
    </Screen>
  );
}
