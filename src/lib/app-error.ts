/** A failure whose message can be shown to the patient as is. */
export class AppError extends Error {
  override name = "AppError";
}

/** Patient-facing message for any error; AppError messages pass through. */
export function errorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  return error instanceof AppError ? error.message : fallback;
}
