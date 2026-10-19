import * as z from "zod"

// Shared by the Playground's forms (shadcn's Field + React Hook Form + Zod
// pattern): each form keeps its own schema, built from these pieces.

/**
 * A required email address. Empty and malformed get their own messages; a
 * form whose copy has one message for both passes it as each.
 */
export function emailAddress({
  missing = "Enter your email address.",
  invalid = "Enter a valid email address.",
}: { missing?: string; invalid?: string } = {}) {
  return z.string().trim().min(1, missing).pipe(z.email(invalid))
}

/**
 * Ref callback for a form's confirmation: focuses it as it mounts, so a
 * keyboard or screen reader user lands on the result of a valid submit.
 * Module-level, so React calls it once per mount rather than on every render.
 */
export function focusOnMount(node: HTMLElement | null) {
  node?.focus()
}
