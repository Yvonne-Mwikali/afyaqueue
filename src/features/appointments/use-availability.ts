import { useEffect, useState } from "react";

import { doctorsForService } from "@/features/doctors/doctor";
import { useDoctors } from "@/features/doctors/use-doctors";
import { useActiveHospitalId } from "@/features/hospitals/hospital-context";
import { availabilitySource } from "@/lib/backend";

import type { DayAvailability } from "./availability";
import { usePatientAppointments } from "./use-patient-appointments";

type AvailabilityState =
  { status: "loading" } | { status: "ready"; days: DayAvailability[] } | { status: "error" };

/**
 * Bookable days for a service and doctor choice. Computed once the
 * patient's own appointments are known, then held so the list doesn't
 * shift while they choose.
 */
export function useAvailability(
  serviceId: string | undefined,
  doctorId: string | null,
  durationMinutes: number | undefined
): AvailabilityState {
  const appointments = usePatientAppointments();
  const hospitalId = useActiveHospitalId();
  const doctors = useDoctors();
  const [state, setState] = useState<AvailabilityState>({ status: "loading" });
  const serviceDoctorIds = serviceId
    ? doctorsForService(doctors.doctors, serviceId).map((doctor) => doctor.id)
    : [];
  const doctorKey = serviceDoctorIds.join(",");
  const ready = appointments.status !== "loading" && doctors.status !== "loading" && !!hospitalId;
  const computed = state.status !== "loading";

  useEffect(() => {
    if (!serviceId || !hospitalId || durationMinutes === undefined || !ready || computed) return;
    let cancelled = false;
    availabilitySource
      .daysFor({
        hospitalId,
        serviceId,
        doctorId,
        serviceDoctorIds: doctorKey ? doctorKey.split(",") : [],
        durationMinutes,
        patientAppointments: appointments.appointments,
      })
      .then(
        (days) => {
          if (!cancelled) setState({ status: "ready", days });
        },
        () => {
          if (!cancelled) setState({ status: "error" });
        }
      );
    return () => {
      cancelled = true;
    };
  }, [
    hospitalId,
    serviceId,
    doctorId,
    doctorKey,
    durationMinutes,
    ready,
    computed,
    appointments.appointments,
  ]);

  return state;
}
