import { useRouter } from "expo-router";
import type { JSX } from "react";

import { HospitalContact } from "@/components/shared/hospital-contact";
import { PatientHeader } from "@/components/shared/patient-header";
import { Screen } from "@/components/ui/screen";
import { useHospitalContext } from "@/features/hospitals/hospital-context";
import { useHospitalDetails } from "@/features/hospitals/use-hospital-details";
import { usePatientIdentity } from "@/features/users/use-user-profile";

/** Contact the patient's current hospital (follows hospital switching). */
export default function PatientContactRoute(): JSX.Element {
  const router = useRouter();
  const { initials } = usePatientIdentity();
  const { patientHospital } = useHospitalContext();
  const details = useHospitalDetails(patientHospital?.id ?? null);

  return (
    <Screen>
      <PatientHeader
        title="Contact"
        titleVariant="screen"
        initials={initials}
        onPressProfile={() => router.navigate("/profile")}
      />
      <HospitalContact
        status={patientHospital ? details.status : "ready"}
        hospital={details.hospital}
        onRetry={details.retry}
      />
    </Screen>
  );
}
