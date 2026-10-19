"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { Controller, useForm } from "react-hook-form"
import * as z from "zod"

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

// The fake auth forms, on shadcn's Field + React Hook Form + Zod pattern
// (https://ui.shadcn.com/docs/forms/react-hook-form): a schema per form, a
// Controller per field. React Hook Form validates on submit, re-validates on
// change and focuses the first invalid field. A valid submit goes to the
// dashboard: nothing is sent anywhere and any password works.
//
// `method="post"`: before hydration the browser submits the form itself, and
// a GET would put the email and password in the URL.

/** Where a successful (fake) login or signup lands. */
const AFTER_AUTH = "/app"

const email = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .pipe(z.email("Enter a valid email address."))

const loginSchema = z.object({
  email,
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
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="login-email">Email</FieldLabel>
              <Input
                {...field}
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={fieldState.invalid}
                aria-describedby={
                  fieldState.invalid ? "login-email-error" : undefined
                }
              />
              {fieldState.invalid && (
                <FieldError
                  id="login-email-error"
                  errors={[fieldState.error]}
                />
              )}
            </Field>
          )}
        />
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="login-password">Password</FieldLabel>
              <Input
                {...field}
                id="login-password"
                type="password"
                autoComplete="current-password"
                aria-invalid={fieldState.invalid}
                aria-describedby={
                  fieldState.invalid ? "login-password-error" : undefined
                }
              />
              {fieldState.invalid && (
                <FieldError
                  id="login-password-error"
                  errors={[fieldState.error]}
                />
              )}
            </Field>
          )}
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
  email,
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
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="signup-name">Name</FieldLabel>
              <Input
                {...field}
                id="signup-name"
                type="text"
                autoComplete="name"
                aria-invalid={fieldState.invalid}
                aria-describedby={
                  fieldState.invalid ? "signup-name-error" : undefined
                }
              />
              {fieldState.invalid && (
                <FieldError
                  id="signup-name-error"
                  errors={[fieldState.error]}
                />
              )}
            </Field>
          )}
        />
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="signup-email">Email</FieldLabel>
              <Input
                {...field}
                id="signup-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={fieldState.invalid}
                aria-describedby={
                  fieldState.invalid ? "signup-email-error" : undefined
                }
              />
              {fieldState.invalid && (
                <FieldError
                  id="signup-email-error"
                  errors={[fieldState.error]}
                />
              )}
            </Field>
          )}
        />
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="signup-password">Password</FieldLabel>
              <Input
                {...field}
                id="signup-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
                aria-describedby={
                  fieldState.invalid ? "signup-password-error" : undefined
                }
              />
              {fieldState.invalid ? (
                <FieldError
                  id="signup-password-error"
                  errors={[fieldState.error]}
                />
              ) : (
                <FieldDescription>Any password works here.</FieldDescription>
              )}
            </Field>
          )}
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
