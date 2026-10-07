import type { ServiceSummary } from "@/features/services/service-catalog";
import type { ServiceRepository } from "@/features/services/service-repository";

/**
 * Static service catalog for the Services screen. Replace with the services
 * repository once the backend boundary exists.
 */
export const servicesMock: ServiceSummary[] = [
  {
    id: "general-care",
    name: "General Care",
    shortName: "General",
    description: "Routine checkups, illness & more",
    category: "primary",
    icon: "stethoscope",
    providerTitle: "General Practitioner",
    durationMinutes: 20,
    modes: ["in-clinic", "online"],
  },
  {
    id: "dental",
    name: "Dental",
    description: "Oral health, preventive and restorative care",
    category: "specialty",
    icon: "tooth-outline",
    providerTitle: "Dentist",
    durationMinutes: 45,
    modes: ["in-clinic"],
  },
  {
    id: "oncology",
    name: "Oncology",
    description: "Cancer care and specialist consultations",
    category: "specialty",
    icon: "ribbon",
    tint: "pink",
    providerTitle: "Oncologist",
    durationMinutes: 30,
    modes: ["in-clinic", "online"],
  },
  {
    id: "pediatrics",
    name: "Pediatrics",
    description: "Complete care for your child",
    category: "primary",
    icon: "baby-face-outline",
    providerTitle: "Paediatrician",
    durationMinutes: 30,
    modes: ["in-clinic", "online"],
  },
  {
    id: "dermatology",
    name: "Dermatology",
    description: "Skin, hair and nail care",
    category: "specialty",
    icon: "hand-back-right-outline",
    providerTitle: "Dermatologist",
    durationMinutes: 30,
    modes: ["in-clinic", "online"],
  },
  {
    id: "laboratory",
    name: "Laboratory",
    description: "Diagnostic tests and screenings",
    category: "diagnostic",
    icon: "flask-outline",
    providerTitle: "Pathologist",
    durationMinutes: 15,
    modes: ["in-clinic"],
  },
];

/** Stands in for Firestore while Firebase is not configured (src/lib/backend.ts). */
export const mockServiceRepository: ServiceRepository = {
  listActive: () => Promise.resolve(servicesMock),
};
