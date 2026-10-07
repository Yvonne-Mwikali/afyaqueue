import { useState } from "react";

type Validators<K extends string> = Record<K, (values: Record<K, string>) => string | undefined>;

export type AuthForm<K extends string> = {
  values: Record<K, string>;
  setValue: (key: K, value: string) => void;
  /** Call when a field loses focus; it shows its error once the patient has typed in it. */
  blur: (key: K) => void;
  /** Visible error for a field, if any. */
  errorOf: (key: K) => string | undefined;
  /** Shows every error; returns true when the form is valid. */
  validateAll: () => boolean;
};

/**
 * Form state with considerate validation: a field shows its error only
 * after the patient has typed in it and moved on, or after they try to
 * submit. Once shown, errors update live so they clear as soon as fixed.
 */
export function useAuthForm<K extends string>(
  validators: Validators<K>,
  /** Optional starting values (e.g. an email carried over from Sign In). */
  initial: Partial<Record<K, string>> = {}
): AuthForm<K> {
  const keys = Object.keys(validators) as K[];
  const [values, setValues] = useState(
    () => Object.fromEntries(keys.map((key) => [key, initial[key] ?? ""])) as Record<K, string>
  );
  const [touched, setTouched] = useState<Partial<Record<K, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  return {
    values,
    setValue: (key, value) => setValues((current) => ({ ...current, [key]: value })),
    blur: (key) => {
      if (values[key]) setTouched((current) => ({ ...current, [key]: true }));
    },
    errorOf: (key) => (submitted || touched[key] ? validators[key](values) : undefined),
    validateAll: () => {
      setSubmitted(true);
      return keys.every((key) => validators[key](values) === undefined);
    },
  };
}
