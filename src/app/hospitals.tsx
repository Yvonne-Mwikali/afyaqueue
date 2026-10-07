import { useRouter } from "expo-router";
import type { JSX } from "react";

import { HospitalList } from "@/components/shared/context-pickers";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";

/** Patient mode: switch the hospital that services, booking and queues use. */
export default function HospitalsRoute(): JSX.Element {
  const router = useRouter();
  return (
    <Screen header={<ScreenHeader title="Choose hospital" onBack={() => router.back()} />}>
      <HospitalList onChosen={() => router.back()} />
    </Screen>
  );
}
