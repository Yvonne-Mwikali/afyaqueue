import type { JSX } from "react";

import { ScreenPlaceholder } from "@/components/shared/screen-placeholder";

// Placeholder for the centre Contact action; no calling workflow exists yet.
export default function PatientContactRoute(): JSX.Element {
  return (
    <ScreenPlaceholder
      title="Contact the care team"
      description="Calling and messaging are not available yet."
    />
  );
}
