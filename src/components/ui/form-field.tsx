import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  FieldError,
  InputGroup,
  Label,
  PressableFeedback,
  TextField,
  useThemeColor,
} from "heroui-native";
import { type JSX, type Ref, useState } from "react";
import type { TextInput, TextInputProps } from "react-native";

import { iconSize, useBrandColor } from "@/design-system";

import type { IconName } from "./icon-tile";

type FormFieldProps = Omit<TextInputProps, "secureTextEntry" | "onBlur" | "onFocus"> & {
  label: string;
  icon: IconName;
  /** Shown below the input; also marks the field invalid. */
  error?: string;
  /** Password field: hidden text with a show/hide toggle. */
  isPassword?: boolean;
  onBlur?: () => void;
  ref?: Ref<TextInput>;
};

/**
 * Labelled text input for forms: quiet filled field with a leading outline
 * icon that turns orange on focus, an optional password visibility toggle
 * and an inline error. Built on HeroUI TextField + InputGroup.
 */
export function FormField({
  label,
  icon,
  error,
  isPassword = false,
  onBlur,
  ref,
  ...inputProps
}: FormFieldProps): JSX.Element {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const muted = useThemeColor("muted");
  const vivid = useBrandColor("brand-vivid");
  const invalid = error !== undefined;

  return (
    <TextField isInvalid={invalid}>
      <Label>{label}</Label>
      <InputGroup>
        <InputGroup.Prefix isDecorative>
          <MaterialCommunityIcons name={icon} size={iconSize.md} color={focused ? vivid : muted} />
        </InputGroup.Prefix>
        <InputGroup.Input
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={error}
          secureTextEntry={isPassword && !revealed}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          className="h-12 rounded-2xl shadow-none"
          {...inputProps}
        />
        {isPassword ? (
          <InputGroup.Suffix>
            <PressableFeedback
              onPress={() => setRevealed((shown) => !shown)}
              accessibilityRole="button"
              accessibilityLabel={revealed ? "Hide password" : "Show password"}
              hitSlop={12}
              className="size-6 items-center justify-center rounded-full"
            >
              <MaterialCommunityIcons
                name={revealed ? "eye-outline" : "eye-off-outline"}
                size={iconSize.md}
                color={muted}
              />
            </PressableFeedback>
          </InputGroup.Suffix>
        ) : null}
      </InputGroup>
      {invalid ? <FieldError>{error}</FieldError> : null}
    </TextField>
  );
}
