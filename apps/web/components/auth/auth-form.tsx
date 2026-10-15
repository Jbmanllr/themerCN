"use client"

import { useRouter } from "next/navigation"
import { useState, type FormEvent, type ReactNode } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Spinner } from "@workspace/ui/components/spinner"

export type AuthField = {
  name: string
  label: string
  type: "text" | "email" | "password"
  autoComplete: string
  placeholder?: string
  description?: string
  /** Shown when the field is left empty. */
  missing: string
}

/** Where a successful (fake) login or signup lands. */
const AFTER_AUTH = "/app"

/**
 * A fake auth form: it checks that every field is filled in, then goes to
 * the dashboard. Nothing is sent anywhere and any password works.
 */
export function AuthForm({
  fields,
  submitLabel,
  footer,
}: {
  fields: AuthField[]
  submitLabel: string
  footer?: ReactNode
}) {
  const router = useRouter()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, setPending] = useState(false)

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const next: Record<string, string> = {}
    for (const field of fields) {
      if (!String(data.get(field.name) ?? "").trim()) {
        next[field.name] = field.missing
      }
    }
    setErrors(next)
    if (Object.keys(next).length > 0) {
      const first = fields.find((field) => next[field.name])
      if (first) document.getElementById(`auth-${first.name}`)?.focus()
      return
    }
    setPending(true)
    router.push(AFTER_AUTH)
  }

  return (
    <form noValidate onSubmit={onSubmit}>
      <FieldGroup>
        {fields.map((field) => {
          const id = `auth-${field.name}`
          const error = errors[field.name]
          return (
            <Field key={field.name} data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
              <Input
                id={id}
                name={field.name}
                type={field.type}
                autoComplete={field.autoComplete}
                placeholder={field.placeholder}
                required
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-error` : undefined}
              />
              {field.description && !error && (
                <FieldDescription>{field.description}</FieldDescription>
              )}
              {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
            </Field>
          )
        })}
        <Field>
          <Button type="submit" size="lg" disabled={pending}>
            {pending && <Spinner data-icon="inline-start" />}
            {submitLabel}
          </Button>
          {footer}
        </Field>
      </FieldGroup>
    </form>
  )
}
