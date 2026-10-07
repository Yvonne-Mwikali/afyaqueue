import { createHospitalCache } from "@/features/hospitals/hospital-cache";
import { serviceRepository } from "@/lib/backend";

import type { ServiceSummary } from "./service-catalog";

const catalog = createHospitalCache<ServiceSummary>((hospitalId) =>
  serviceRepository.listActive(hospitalId)
);

/** A specific hospital's services (e.g. an appointment's own hospital). */
export function useServiceCatalogFor(hospitalId: string | null): {
  status: "loading" | "ready" | "error";
  services: readonly ServiceSummary[];
} {
  const { status, data } = catalog.useFor(hospitalId);
  return { status, services: data };
}

/** Service lookup across several hospitals (appointments everywhere). */
export function useServicesAcross(
  hospitalIds: readonly string[]
): (hospitalId: string, serviceId: string) => ServiceSummary | undefined {
  const of = catalog.useMany(hospitalIds);
  return (hospitalId, serviceId) => of(hospitalId).find((service) => service.id === serviceId);
}

/** The active hospital's bookable services, shared by every screen. */
export function useServiceCatalog(): {
  status: "loading" | "ready" | "error";
  services: readonly ServiceSummary[];
  retry: () => void;
} {
  const { status, data, retry } = catalog.use();
  return { status, services: data, retry };
}
