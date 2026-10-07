import type { ServiceSummary } from "./service-catalog";

/** Read access to the hospital's service catalog. */
export interface ServiceRepository {
  /** A hospital's bookable services, in display order. */
  listActive(hospitalId: string): Promise<ServiceSummary[]>;
}
