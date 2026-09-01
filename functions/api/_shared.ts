/// <reference types="@cloudflare/workers-types" />

/**
 * Bindings declared in wrangler.toml. Names are locked by the kickoff doc.
 */
export interface Env {
  DB: D1Database;
  /** Unused in Session 1. Declared because the binding is locked. */
  MEDIA: R2Bucket;
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export function badRequest(message: string): Response {
  return json({ error: message }, 400);
}

/** Narrow an unknown to a non-empty trimmed string, or null. */
export function str(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Narrow an unknown to a non-negative integer, or null. */
export function int(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

export function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | null {
  const s = str(value);
  return s !== null && (allowed as readonly string[]).includes(s)
    ? (s as T)
    : null;
}

/** Parse a JSON text column, falling back to a default on anything unexpected. */
export function parseJsonColumn<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== "string" || raw.length === 0) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}
