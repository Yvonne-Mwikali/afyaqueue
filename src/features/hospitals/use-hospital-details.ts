import { useEffect, useState } from "react";

import { hospitalRepository } from "@/lib/backend";

import type { Hospital } from "./hospital";

type State = {
  /** Which hospital `hospital` belongs to: a switch never shows the previous one. */
  hospitalId: string | null;
  status: "loading" | "ready" | "error";
  hospital: Hospital | null;
};

/** One hospital's public details, live (admin edits appear immediately). */
export function useHospitalDetails(hospitalId: string | null): {
  status: State["status"];
  hospital: Hospital | null;
  retry: () => void;
} {
  const [state, setState] = useState<State>({
    hospitalId: null,
    status: "loading",
    hospital: null,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!hospitalId) return undefined;
    return hospitalRepository.watchHospital(
      hospitalId,
      (hospital) => setState({ hospitalId, status: "ready", hospital }),
      () => setState({ hospitalId, status: "error", hospital: null })
    );
  }, [hospitalId, attempt]);

  const current = state.hospitalId === hospitalId;
  return {
    status: current ? state.status : "loading",
    hospital: current ? state.hospital : null,
    retry: () => setAttempt((count) => count + 1),
  };
}
