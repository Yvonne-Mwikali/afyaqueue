import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, Typography } from "heroui-native";
import { type JSX, useState } from "react";
import { View } from "react-native";

import { LoadingState } from "@/components/feedback/loading-state";
import { AnyDoctorOption, DoctorOption } from "@/components/shared/doctor-option";
import { ServiceDetailCard } from "@/components/shared/service-detail-card";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { textRole } from "@/design-system";
import { ANY_AVAILABLE_DOCTOR_ID, doctorsForService } from "@/features/doctors/doctor";
import { useDoctors } from "@/features/doctors/use-doctors";
import { useServiceCatalog } from "@/features/services/use-service-catalog";

export default function ServiceDetailRoute(): JSX.Element {
  const router = useRouter();
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>();
  const catalog = useServiceCatalog();
  const doctorsState = useDoctors();
  const service = catalog.services.find((item) => item.id === serviceId);
  // Any Available Doctor is the default choice.
  const [doctorId, setDoctorId] = useState<string>(ANY_AVAILABLE_DOCTOR_ID);
  const back = (): void => router.back();

  if (!service && catalog.status === "loading") {
    return (
      <Screen header={<ScreenHeader title="Service" onBack={back} />}>
        <LoadingState title="Loading service" />
      </Screen>
    );
  }

  if (!service) {
    return (
      <Screen header={<ScreenHeader title="Service" onBack={back} />}>
        {catalog.status === "error" ? (
          <View className="items-start gap-3">
            <Typography.Paragraph color="muted">
              We couldn&apos;t load this service. Check your connection.
            </Typography.Paragraph>
            <Button variant="tertiary" size="sm" hitSlop={4} onPress={catalog.retry}>
              <Button.Label>Try again</Button.Label>
            </Button>
          </View>
        ) : (
          <Typography.Paragraph color="muted">This service is not available.</Typography.Paragraph>
        )}
      </Screen>
    );
  }

  // Active doctors linked to this service (doctorServices), in display order.
  const doctors = doctorsForService(doctorsState.doctors, service.id);

  return (
    <Screen
      header={<ScreenHeader title={service.name} onBack={back} />}
      footer={
        <PrimaryButton
          label="Continue"
          accessibilityHint="Choose a date and time"
          onPress={() =>
            router.push({ pathname: "/book", params: { serviceId: service.id, doctorId } })
          }
        />
      }
    >
      <ServiceDetailCard service={service} />

      <View className="gap-2.5">
        <View>
          <Typography
            type={textRole.sectionTitle.type}
            weight={textRole.sectionTitle.weight}
            accessibilityRole="header"
          >
            Choose a Doctor
          </Typography>
          <Typography.Paragraph type={textRole.supporting.type} color="muted">
            Select a doctor to continue with your booking.
          </Typography.Paragraph>
        </View>

        <View className="gap-2" accessibilityRole="radiogroup">
          <AnyDoctorOption
            providerTitle={service.providerTitle}
            selected={doctorId === ANY_AVAILABLE_DOCTOR_ID}
            onSelect={() => setDoctorId(ANY_AVAILABLE_DOCTOR_ID)}
          />
          {doctors.map((doctor) => (
            <DoctorOption
              key={doctor.id}
              doctor={doctor}
              selected={doctorId === doctor.id}
              onSelect={() => setDoctorId(doctor.id)}
            />
          ))}
          {doctors.length === 0 && doctorsState.status === "loading" ? (
            <LoadingState title="Loading doctors" />
          ) : null}
          {doctors.length === 0 && doctorsState.status === "error" ? (
            <View className="items-start gap-2 px-1">
              <Typography.Paragraph type={textRole.supporting.type} color="muted">
                We couldn&apos;t load doctors. You can still book any available doctor.
              </Typography.Paragraph>
              <Button variant="tertiary" size="sm" hitSlop={4} onPress={doctorsState.retry}>
                <Button.Label>Try again</Button.Label>
              </Button>
            </View>
          ) : null}
          {doctors.length === 0 && doctorsState.status === "ready" ? (
            <Typography.Paragraph type={textRole.supporting.type} color="muted" className="px-1">
              No specific doctors are listed for this service yet.
            </Typography.Paragraph>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}
