"use client"

import { CheckIcon } from "lucide-react"
import { useRef, useState, type FormEvent } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"
import { Textarea } from "@workspace/ui/components/textarea"

const topics = ["An order", "My subscription", "Wholesale", "Something else"]

type Values = { name: string; email: string; topic: string; message: string }
type Errors = Partial<Record<keyof Values, string>>

function validate(values: Values): Errors {
  const errors: Errors = {}
  if (!values.name.trim())
    errors.name = "Add your name so we know who to reply to."
  if (!/^\S+@\S+\.\S+$/.test(values.email))
    errors.email = "Add an email address we can reply to, like you@example.com."
  if (!values.message.trim()) errors.message = "Write a message before sending."
  return errors
}

/**
 * The fake contact form: it validates, sends nothing, and ends on a
 * confirmation that names the reply address.
 */
export function ContactForm() {
  const [errors, setErrors] = useState<Errors>({})
  const [sentTo, setSentTo] = useState<string | null>(null)
  const confirmation = useRef<HTMLDivElement>(null)

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const values = Object.fromEntries(
      ["name", "email", "topic", "message"].map((key) => [
        key,
        String(data.get(key) ?? ""),
      ])
    ) as Values
    const found = validate(values)
    setErrors(found)
    const firstInvalid = Object.keys(found)[0]
    if (firstInvalid) {
      event.currentTarget
        .querySelector<HTMLElement>(`[name="${firstInvalid}"]`)
        ?.focus()
      return
    }
    setSentTo(values.email)
    requestAnimationFrame(() => confirmation.current?.focus())
  }

  if (sentTo) {
    return (
      <div
        ref={confirmation}
        role="status"
        tabIndex={-1}
        className="flex flex-col items-start gap-4 rounded-3xl bg-accent p-8 text-accent-foreground outline-none"
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <CheckIcon aria-hidden className="size-5" />
        </span>
        <h2 className="font-heading text-2xl">Message sent</h2>
        <p>
          Thanks for writing. We reply from the roastery within two working
          days, to {sentTo}.
        </p>
        <Button variant="outline" onClick={() => setSentTo(null)}>
          Write another message
        </Button>
      </div>
    )
  }

  return (
    <form noValidate onSubmit={onSubmit} aria-label="Contact the roastery">
      <FieldGroup>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field data-invalid={errors.name ? true : undefined}>
            <FieldLabel htmlFor="contact-name">Name</FieldLabel>
            <Input
              id="contact-name"
              name="name"
              autoComplete="name"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? "contact-name-error" : undefined}
            />
            <FieldError id="contact-name-error">{errors.name}</FieldError>
          </Field>
          <Field data-invalid={errors.email ? true : undefined}>
            <FieldLabel htmlFor="contact-email">Email</FieldLabel>
            <Input
              id="contact-email"
              name="email"
              type="email"
              autoComplete="email"
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={
                errors.email ? "contact-email-error" : undefined
              }
            />
            <FieldError id="contact-email-error">{errors.email}</FieldError>
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="contact-topic">Topic</FieldLabel>
          <NativeSelect
            id="contact-topic"
            name="topic"
            className="w-full sm:w-64"
          >
            {topics.map((topic) => (
              <NativeSelectOption key={topic} value={topic}>
                {topic}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field data-invalid={errors.message ? true : undefined}>
          <FieldLabel htmlFor="contact-message">Message</FieldLabel>
          <Textarea
            id="contact-message"
            name="message"
            rows={6}
            aria-invalid={errors.message ? true : undefined}
            aria-describedby={
              errors.message ? "contact-message-error" : "contact-message-hint"
            }
          />
          {errors.message ? (
            <FieldError id="contact-message-error">{errors.message}</FieldError>
          ) : (
            <FieldDescription id="contact-message-hint">
              For an order, include its number (it starts with NJ-).
            </FieldDescription>
          )}
        </Field>
        <div>
          <Button type="submit" size="lg">
            Send message
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
