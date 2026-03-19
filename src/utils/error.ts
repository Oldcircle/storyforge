/** Remove API keys and tokens from error messages before they reach UI/logs. */
export function sanitizeErrorMessage(
  msg: string,
  secrets: string[] = [],
): string {
  let safe = msg;
  for (const secret of secrets) {
    if (secret.length > 8) {
      safe = safe.replaceAll(secret, `${secret.slice(0, 4)}***`);
    }
  }
  // Mask token-like URL query parameters
  safe = safe.replace(
    /([?&](?:token|key|api_key|apikey|authorization)=)[^&\s]+/gi,
    "$1***",
  );
  return safe;
}

/** Extract a useful message from an unknown catch value. */
export function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return String(err);
}
