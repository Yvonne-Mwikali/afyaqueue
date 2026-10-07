import type { IconName, IconTileTint } from "@/components/ui/icon-tile";

/** Service grouping used by the Services screen filters. */
export type ServiceCategory = "primary" | "specialty" | "diagnostic";

export type ServiceSummary = {
  id: string;
  name: string;
  /** Compact patient-facing label for tight layouts (Home shortcuts). Defaults to name. */
  shortName?: string;
  description: string;
  category: ServiceCategory;
  icon: IconName;
  tint?: IconTileTint;
  /** Who the patient sees, e.g. "Oncologist" (Service Detail metadata). */
  providerTitle: string;
  durationMinutes: number;
  /** How the service can be delivered. */
  modes: ServiceMode[];
};

export type ServiceMode = "in-clinic" | "online";

/** "In-clinic & Online" style label for a service's delivery modes. */
export function formatServiceModes(modes: readonly ServiceMode[]): string {
  const labels: Record<ServiceMode, string> = { "in-clinic": "In-clinic", online: "Online" };
  return modes.map((mode) => labels[mode]).join(" & ");
}

export type ServiceFilter = "all" | ServiceCategory;

/** Services in the given id order, skipping unknown ids. */
export function pickServices(
  services: readonly ServiceSummary[],
  ids: readonly string[]
): ServiceSummary[] {
  return ids.flatMap((id) => services.find((service) => service.id === id) ?? []);
}

export const SERVICE_FILTERS: { id: ServiceFilter; label: string }[] = [
  { id: "all", label: "All Services" },
  { id: "primary", label: "Primary Care" },
  { id: "specialty", label: "Specialties" },
  { id: "diagnostic", label: "Diagnostics" },
];

/**
 * Services matching a category filter and a free-text query (name or
 * description, case-insensitive).
 */
export function filterServices(
  services: readonly ServiceSummary[],
  filter: ServiceFilter,
  query: string
): ServiceSummary[] {
  const needle = query.trim().toLowerCase();
  return services.filter(
    (service) =>
      (filter === "all" || service.category === filter) &&
      (needle === "" ||
        service.name.toLowerCase().includes(needle) ||
        service.description.toLowerCase().includes(needle))
  );
}
