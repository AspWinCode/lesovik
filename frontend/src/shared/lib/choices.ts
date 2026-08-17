/**
 * Normalizes a select/multi_select field's `field_options.choices` into a
 * consistent `{ value, label }` list.
 *
 * Two shapes exist in the data: entities created through the entity builder
 * store choices as bare strings (`["draft", "paid"]`), while module-installed
 * entities store `{ value, label }` objects. Callers should always go through
 * this function rather than casting `choices` directly, or they'll render an
 * empty dropdown for the (very common) bare-string shape.
 */
export function normalizeChoices(raw: unknown): { value: string; label: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((c) =>
    typeof c === "string" ? { value: c, label: c } : (c as { value: string; label: string })
  );
}
