import { useRouter } from "expo-router";

import type { JSX } from "react";
import { View } from "react-native";

import { AdminRow, asIcon, EmptyState } from "@/components/admin/admin-ui";
import { LoadingState } from "@/components/feedback/loading-state";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useAdminLinks, useAdminServices } from "@/features/admin/use-admin";

/** Every service, active and archived. Services are never deleted. */
export default function AdminServicesRoute(): JSX.Element {
  const router = useRouter();
  const services = useAdminServices();
  const links = useAdminLinks();
  const open = (serviceId: string): void =>
    router.push({ pathname: "/admin/services/[serviceId]", params: { serviceId } });

  return (
    <Screen header={<ScreenHeader title="Services" onBack={() => router.back()} />}>
      {services.status === "loading" ? (
        <LoadingState title="Loading services" />
      ) : services.data.length === 0 ? (
        <EmptyState
          icon="medical-bag"
          title="No services yet"
          description="Create the services patients can book, then assign doctors."
          action={{ label: "Add service", onPress: () => open("new") }}
        />
      ) : (
        <View className="gap-2">
          {services.data.map((service) => {
            const doctors = links.data.filter((l) => l.serviceId === service.id && l.active).length;
            return (
              <AdminRow
                key={service.id}
                icon={asIcon(service.icon)}
                title={service.name}
                subtitle={`${service.durationMinutes} min · ${service.modes.map((m) => (m === "in-clinic" ? "In-clinic" : "Online")).join(" & ")}`}
                detail={`${doctors} doctor${doctors === 1 ? "" : "s"}`}
                pill={
                  service.active
                    ? { label: "Active", tone: "success" }
                    : { label: "Inactive", tone: "muted" }
                }
                muted={!service.active}
                onPress={() => open(service.id)}
              />
            );
          })}
        </View>
      )}
      <PrimaryButton label="Add service" icon="plus" onPress={() => open("new")} />
    </Screen>
  );
}
