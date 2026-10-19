"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { CheckIcon } from "lucide-react"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import * as z from "zod"

import { TextField } from "@/components/forms/text-field"
import { emailAddress, focusOnMount } from "@/lib/forms"
import { Button } from "@workspace/ui/components/button"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"

const topics = ["An order", "My subscription", "Wholesale", "Something else"]

const REPLY_ADDRESS =
  "Add an email address we can reply to, like you@example.com."

const contactSchema = z.object({
  name: z.string().trim().min(1, "Add your name so we know who to reply to."),
  // One message for empty and malformed: either way we can't reply.
  email: emailAddress({
    missing: REPLY_ADDRESS,
    invalid: REPLY_ADDRESS,
  }),
  topic: z.string(),
  message: z.string().trim().min(1, "Write a message before sending."),
})

type ContactValues = z.infer<typeof contactSchema>

const empty: ContactValues = {
  name: "",
  email: "",
  topic: topics[0]!,
  message: "",
}

/**
 * The fake contact form, on shadcn's Field + React Hook Form + Zod pattern:
 * it validates, sends nothing, and ends on a focused confirmation that names
 * the reply address. `method="post"` keeps a pre-hydration submit out of the
 * URL.
 */
export function ContactForm() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: empty,
  })

  if (sentTo) {
    return (
      <div
        ref={focusOnMount}
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
        <Button
          variant="outline"
          onClick={() => {
            form.reset(empty)
            setSentTo(null)
          }}
        >
          Write another message
        </Button>
      </div>
    )
  }

  return (
    <form
      method="post"
      noValidate
      onSubmit={form.handleSubmit((values) => setSentTo(values.email))}
      aria-label="Contact the roastery"
    >
      <FieldGroup>
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField
            control={form.control}
            name="name"
            id="contact-name"
            label="Name"
            autoComplete="name"
          />
          <TextField
            control={form.control}
            name="email"
            id="contact-email"
            label="Email"
            type="email"
            autoComplete="email"
          />
        </div>
        <Controller
          name="topic"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="contact-topic">Topic</FieldLabel>
              <NativeSelect
                {...field}
                id="contact-topic"
                className="w-full sm:w-64"
              >
                {topics.map((topic) => (
                  <NativeSelectOption key={topic} value={topic}>
                    {topic}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          )}
        />
        <TextField
          control={form.control}
          name="message"
          id="contact-message"
          label="Message"
          multiline
          rows={6}
          description="For an order, include its number (it starts with NJ-)."
        />
        <div>
          <Button type="submit" size="lg">
            Send message
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
