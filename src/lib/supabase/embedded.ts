/**
 * Helpers for reading embedded rows out of a PostgREST select.
 */

/**
 * Read a to-one embedded row.
 *
 * supabase-js types an embedded resource as an array whenever the underlying
 * foreign key is not marked unique (`isOneToOne: false` in the generated
 * relationships), even though PostgREST returns a single object for a forward
 * many-to-one reference — `vendors(name)` on a row that holds one `vendor_id`
 * comes back as `{ name }`, not `[{ name }]`.
 *
 * Call sites used to paper over this with `as { name: string } | null`, which
 * TypeScript rejects outright (the inferred array and the object don't
 * overlap). This accepts either shape at runtime, so it stays correct whichever
 * way the query is written.
 */
export function embeddedOne<T>(value: unknown): T | null {
  if (value == null) return null
  if (Array.isArray(value)) return (value[0] as T | undefined) ?? null
  return value as T
}
