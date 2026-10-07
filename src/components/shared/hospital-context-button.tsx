import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { PressableFeedback, Typography } from "heroui-native";
import type { JSX } from "react";
import { View } from "react-native";

import { iconSize, textRole, useBrandColor } from "@/design-system";
import { useHospitalContext } from "@/features/hospitals/hospital-context";

/** "AfyaCare Hospital ▾ · Westlands, Nairobi": the patient's current hospital, tap to switch. */
export function HospitalContextButton(): JSX.Element | null {
  const router = useRouter();
  const vivid = useBrandColor("brand-vivid");
  const { patientHospital, hospitals } = useHospitalContext();
  if (!patientHospital) return null;
  const canSwitch = hospitals.length > 1;
  const body = (
    <View className="flex-row items-center gap-1.5">
      <MaterialCommunityIcons name="hospital-building" size={iconSize.sm} color={vivid} />
      <Typography
        type={textRole.supporting.type}
        weight="semibold"
        numberOfLines={1}
        className="shrink"
      >
        {patientHospital.name}
      </Typography>
      {canSwitch ? (
        <MaterialCommunityIcons name="chevron-down" size={iconSize.sm} color={vivid} />
      ) : null}
      {patientHospital.location ? (
        <Typography type={textRole.caption.type} color="muted" numberOfLines={1} className="shrink">
          · {patientHospital.location}
        </Typography>
      ) : null}
    </View>
  );
  if (!canSwitch) return body;
  return (
    <PressableFeedback
      onPress={() => router.push("/hospitals")}
      accessibilityRole="button"
      accessibilityLabel={`Hospital: ${patientHospital.name}. Switch hospital`}
      hitSlop={8}
      className="self-start rounded-full"
    >
      {body}
    </PressableFeedback>
  );
}
