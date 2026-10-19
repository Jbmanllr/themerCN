"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { TextField } from "@/components/forms/text-field"
import { emailAddress } from "@/lib/forms"
import { Button } from "@workspace/ui/components/button"
import { Field, FieldGroup } from "@workspace/ui/components/field"
import { Spinner } from "@workspace/ui/components/spinner"

// The fake auth forms, on shadcn's Field + React Hook Form + Zod pattern
// (https://ui.shadcn.com/docs/forms/react-hook-form): a schema per form, a
// TextField (one Controller) per field. React Hook Form validates on submit, re-validates on
// change and focuses the first invalid field. A valid submit goes to the
// dashboard: nothing is sent anywhere and any password works.
//
// `method="post"`: before hydration the browser submits the form itself, and
// a GET would put the email and password in the URL.

/** Where a successful (fake) login or signup lands. */
const AFTER_AUTH = "/app"

const loginSchema = z.object({
  email: emailAddress(),
  password: z.string().min(1, "Enter your password."),
})

export function LoginForm({ footer }: { footer?: ReactNode }) {
  const router = useRouter()
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  return (
    <form
      method="post"
      noValidate
      onSubmit={form.handleSubmit(() => router.push(AFTER_AUTH))}
    >
      <FieldGroup>
        <TextField
          control={form.control}
          name="email"
          id="login-email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
        />
        <TextField
          control={form.control}
          name="password"
          id="login-password"
          label="Password"
          type="password"
          autoComplete="current-password"
        />
        <Field>
          <SubmitButton pending={form.formState.isSubmitSuccessful}>
            Log in
          </SubmitButton>
          {footer}
        </Field>
      </FieldGroup>
    </form>
  )
}

const signupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name."),
  email: emailAddress(),
  password: z.string().min(1, "Choose a password."),
})

export function SignupForm({ footer }: { footer?: ReactNode }) {
  const router = useRouter()
  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "" },
  })

  return (
    <form
      method="post"
      noValidate
      onSubmit={form.handleSubmit(() => router.push(AFTER_AUTH))}
    >
      <FieldGroup>
        <TextField
          control={form.control}
          name="name"
          id="signup-name"
          label="Name"
          autoComplete="name"
        />
        <TextField
          control={form.control}
          name="email"
          id="signup-email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
        />
        <TextField
          control={form.control}
          name="password"
          id="signup-password"
          label="Password"
          type="password"
          autoComplete="new-password"
          description="Any password works here."
        />
        <Field>
          <SubmitButton pending={form.formState.isSubmitSuccessful}>
            Create account
          </SubmitButton>
          {footer}
        </Field>
      </FieldGroup>
    </form>
  )
}

/** Disabled with a spinner once a valid submit is on its way. */
function SubmitButton({
  pending,
  children,
}: {
  pending: boolean
  children: ReactNode
}) {
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending && <Spinner data-icon="inline-start" />}
      {children}
    </Button>
  )
}
