import { MaterialCommunityIcons } from "@expo/vector-icons";
import { collection, type DocumentData, getDocs, orderBy, query, where } from "firebase/firestore";

import type { IconName } from "@/components/ui/icon-tile";
import { COLLECTIONS, firestore } from "@/lib/firebase/firestore";

import type { ServiceCategory, ServiceMode, ServiceSummary } from "./service-catalog";
import type { ServiceRepository } from "./service-repository";

const CATEGORIES: readonly ServiceCategory[] = ["primary", "specialty", "diagnostic"];
const MODES: readonly ServiceMode[] = ["in-clinic", "online"];
const FALLBACK_ICON: IconName = "medical-bag";

function isIconName(value: unknown): value is IconName {
  return typeof value === "string" && value in MaterialCommunityIcons.glyphMap;
}

/**
 * Maps a services/{id} document (docs/firebase-data-model.md) to the domain
 * type. Returns null for documents missing required fields, so one bad
 * document can't break the catalog.
 */
export function parseServiceDocument(id: string, data: DocumentData): ServiceSummary | null {
  const { name, shortName, description, category, icon, tint, providerTitle } = data;
  const { durationMinutes, modes } = data;
  if (
    typeof name !== "string" ||
    typeof description !== "string" ||
    typeof providerTitle !== "string" ||
    typeof durationMinutes !== "number" ||
    !CATEGORIES.includes(category)
  ) {
    return null;
  }
  const validModes = Array.isArray(modes)
    ? MODES.filter((mode) => modes.includes(mode))
    : ["in-clinic" as const];
  return {
    id,
    name,
    ...(typeof shortName === "string" ? { shortName } : {}),
    description,
    category,
    icon: isIconName(icon) ? icon : FALLBACK_ICON,
    ...(tint === "pink" ? { tint } : {}),
    providerTitle,
    durationMinutes,
    modes: validModes.length > 0 ? validModes : ["in-clinic"],
  };
}

export const firestoreServiceRepository: ServiceRepository = {
  listActive: async (hospitalId) => {
    const snapshot = await getDocs(
      query(
        collection(firestore(), COLLECTIONS.services),
        where("hospitalId", "==", hospitalId),
        where("active", "==", true),
        orderBy("sortOrder")
      )
    );
    return snapshot.docs.flatMap(
      (document) => parseServiceDocument(document.id, document.data()) ?? []
    );
  },
};
