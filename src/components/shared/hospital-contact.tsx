import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Button, ListGroup, Typography, useThemeColor } from "heroui-native";
import type { JSX } from "react";
import { Alert, Linking, View } from "react-native";

import { EmptyState } from "@/components/admin/admin-ui";
import { LoadingState } from "@/components/feedback/loading-state";
import { HospitalContextButton } from "@/components/shared/hospital-context-button";
import type { IconName } from "@/components/ui/icon-tile";
import { PrimaryButton } from "@/components/ui/primary-button";
import { iconSize, textRole, useBrandColor } from "@/design-system";
import type { Hospital } from "@/features/hospitals/hospital";
import { dialUrl } from "@/features/staff/call-patient";

function open(url: string, fallback: string): void {
  void Linking.openURL(url).catch(() => Alert.alert("Couldn't open", fallback));
}

function call(phone: string): void {
  const url = dialUrl(phone);
  if (!url) {
    Alert.alert("Couldn't start the call", `Please dial ${phone} yourself.`);
    return;
  }
  open(url, `This phone can't place calls. The number is ${phone}.`);
}

function DetailRow({
  icon,
  title,
  value,
  onPress,
}: {
  icon: IconName;
  title: string;
  value: string;
  onPress?: () => void;
}): JSX.Element {
  const vivid = useBrandColor("brand-vivid");
  return (
    <ListGroup.Item
      {...(onPress ? { onPress } : {})}
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityLabel={`${title}, ${value}`}
    >
      <ListGroup.ItemPrefix>
        <MaterialCommunityIcons name={icon} size={iconSize.md} color={vivid} />
      </ListGroup.ItemPrefix>
      <ListGroup.ItemContent>
        <ListGroup.ItemTitle>{title}</ListGroup.ItemTitle>
        <ListGroup.ItemDescription>{value}</ListGroup.ItemDescription>
      </ListGroup.ItemContent>
      {onPress ? <ListGroup.ItemSuffix /> : null}
    </ListGroup.Item>
  );
}

/**
 * The hospital's real contact details only: a missing field is hidden,
 * and "Call hospital" is disabled when there's no main phone number.
 */
export function HospitalContact({
  status,
  hospital,
  onRetry,
}: {
  status: "loading" | "ready" | "error";
  hospital: Hospital | null;
  onRetry: () => void;
}): JSX.Element {
  if (status === "loading") return <LoadingState title="Loading contact details" />;
  if (status === "error") {
    return (
      <EmptyState
        icon="wifi-off"
        title="Couldn't load contact details"
        description="Check your connection and try again."
        action={{ label: "Try again", onPress: onRetry }}
      />
    );
  }
  if (!hospital) {
    return (
      <EmptyState
        icon="hospital-building"
        title="No hospital chosen"
        description="Choose a hospital to see how to reach it."
      />
    );
  }

  return <ContactDetails hospital={hospital} />;
}

function ContactDetails({ hospital }: { hospital: Hospital }): JSX.Element {
  const danger = useThemeColor("danger");
  const { phone, supportPhone, emergencyPhone, email, location } = hospital;
  const hasDetails = Boolean(supportPhone || emergencyPhone || email || location);

  return (
    <View className="gap-5">
      <HospitalContextButton />

      <View className="gap-3 rounded-3xl bg-linear-to-br from-hero-from to-hero-to p-5">
        <Typography type={textRole.cardTitle.type} weight={textRole.cardTitle.weight}>
          Contact {hospital.name}
        </Typography>
        <Typography type={textRole.supporting.type} color="muted">
          {phone
            ? `Reception · ${phone}`
            : "This hospital hasn't added a phone number yet. Please ask at reception."}
        </Typography>
        <PrimaryButton
          label="Call hospital"
          icon="phone-outline"
          isDisabled={!phone}
          {...(phone ? {} : { accessibilityHint: "No phone number available" })}
          onPress={() => phone && call(phone)}
        />
      </View>

      {emergencyPhone ? (
        <View className="flex-row items-center gap-3 rounded-3xl border border-danger/30 bg-danger/10 p-4">
          <MaterialCommunityIcons name="ambulance" size={iconSize.lg} color={danger} />
          <View className="flex-1">
            <Typography type={textRole.bodyStrong.type} weight="semibold">
              Emergency
            </Typography>
            <Typography type={textRole.supporting.type} color="muted">
              {emergencyPhone}
            </Typography>
          </View>
          <Button
            variant="secondary"
            size="sm"
            onPress={() => call(emergencyPhone)}
            accessibilityLabel={`Call emergency line ${emergencyPhone}`}
          >
            Call
          </Button>
        </View>
      ) : null}

      {hasDetails ? (
        <ListGroup className="border border-border p-0 shadow-none">
          {supportPhone ? (
            <DetailRow
              icon="headset"
              title="Support"
              value={supportPhone}
              onPress={() => call(supportPhone)}
            />
          ) : null}
          {email ? (
            <DetailRow
              icon="email-outline"
              title="Email"
              value={email}
              onPress={() =>
                open(`mailto:${email}`, `No email app is set up. The address is ${email}.`)
              }
            />
          ) : null}
          {location ? (
            <DetailRow icon="map-marker-outline" title="Location" value={location} />
          ) : null}
        </ListGroup>
      ) : null}

      <Typography type={textRole.caption.type} color="muted">
        For a medical emergency, call your local emergency number.
      </Typography>
    </View>
  );
}
