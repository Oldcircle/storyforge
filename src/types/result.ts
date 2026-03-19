/** Discriminated union for operations that can fail gracefully. */
export type Result<T, E = string> =
  | { ok: true; data: T }
  | { ok: false; error: E };
