import { useRouter } from "expo-router";
import { Button, SearchField, Typography } from "heroui-native";
import { type JSX, useState } from "react";
import { View } from "react-native";

import { LoadingState } from "@/components/feedback/loading-state";
import { PatientHeader } from "@/components/shared/patient-header";
import { ServiceCard } from "@/components/shared/service-card";
import { FilterChips } from "@/components/ui/filter-chips";
import { Screen } from "@/components/ui/screen";
import {
  filterServices,
  SERVICE_FILTERS,
  type ServiceFilter,
} from "@/features/services/service-catalog";
import { useServiceCatalog } from "@/features/services/use-service-catalog";
import { usePatientIdentity } from "@/features/users/use-user-profile";
import { chunk } from "@/utils/chunk";

export default function PatientServicesRoute(): JSX.Element {
  const router = useRouter();
  const { initials } = usePatientIdentity();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ServiceFilter>("all");
  const catalog = useServiceCatalog();
  const services = filterServices(catalog.services, filter, query);
  const rows = chunk(services, 2);

  return (
    <Screen>
      <PatientHeader
        title="Services"
        subtitle="Find and book the right care for you."
        titleVariant="screen"
        initials={initials}
        onPressProfile={() => router.navigate("/profile")}
        // Notifications are not built yet.
        onPressNotifications={() => undefined}
        hasUnreadNotifications
      />

      <View className="gap-4">
        <SearchField value={query} onChange={setQuery}>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input
              placeholder="Search for a service, specialty or condition..."
              accessibilityLabel="Search services"
              className="h-12 rounded-full border border-border bg-surface-secondary"
            />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <FilterChips options={SERVICE_FILTERS} selected={filter} onSelect={setFilter} />
      </View>

      <View className="gap-3">
        {rows.map((row) => (
          <View key={row.map((service) => service.id).join("-")} className="flex-row gap-3">
            {row.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onPress={() =>
                  router.push({
                    pathname: "/services/[serviceId]",
                    params: { serviceId: service.id },
                  })
                }
              />
            ))}
            {/* Keep a lone last card at half width. */}
            {row.length === 1 ? <View className="flex-1" /> : null}
          </View>
        ))}
        {catalog.status === "loading" && catalog.services.length === 0 ? (
          <LoadingState title="Loading services" />
        ) : catalog.status === "error" && catalog.services.length === 0 ? (
          <View className="items-center gap-3 py-8">
            <Typography.Paragraph color="muted" align="center">
              We couldn&apos;t load services. Check your connection.
            </Typography.Paragraph>
            <Button variant="tertiary" size="sm" hitSlop={4} onPress={catalog.retry}>
              <Button.Label>Try again</Button.Label>
            </Button>
          </View>
        ) : services.length === 0 ? (
          <Typography.Paragraph color="muted" align="center" className="py-8">
            {catalog.services.length === 0
              ? "No services are available right now."
              : "No services match your search."}
          </Typography.Paragraph>
        ) : null}
      </View>
    </Screen>
  );
}
