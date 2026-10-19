import * as z from "zod"

// Shared by the Playground's forms (shadcn's Field + React Hook Form + Zod
// pattern): each form keeps its own schema, built from these pieces.

/** A required email address: empty and malformed get different messages. */
export const emailAddress = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .pipe(z.email("Enter a valid email address."))

/**
 * Ref callback for a form's confirmation: focuses it as it mounts, so a
 * keyboard or screen reader user lands on the result of a valid submit.
 * Module-level, so React calls it once per mount rather than on every render.
 */
export function focusOnMount(node: HTMLElement | null) {
  node?.focus()
}
