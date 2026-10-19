"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import * as z from "zod"

import { formatPrice } from "@/lib/format"
import { emailAddress, focusOnMount } from "@/lib/forms"
import { plans } from "@/lib/mock"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group"
import { Switch } from "@workspace/ui/components/switch"
import { Textarea } from "@workspace/ui/components/textarea"

const GRINDS = ["Whole bean", "Espresso", "Filter", "French press"]

const NOTIFICATIONS = [
  {
    id: "roastDay",
    label: "Roast day",
    description: "An email when your coffee comes out of the roaster.",
  },
  {
    id: "brewTips",
    label: "Brew tips",
    description: "One short guide a fortnight, matched to your brewer.",
  },
  {
    id: "newOrigins",
    label: "New origins",
    description: "First pick of limited lots before they reach the shop.",
  },
] as const

const settingsSchema = z.object({
  name: z.string().trim().min(1, "Enter your name."),
  email: emailAddress,
  address: z.string(),
  plan: z.string(),
  grind: z.string(),
  notifications: z.object({
    roastDay: z.boolean(),
    brewTips: z.boolean(),
    newOrigins: z.boolean(),
  }),
})

type SettingsValues = z.infer<typeof settingsSchema>

const current: SettingsValues = {
  name: "Ada Brennan",
  email: "ada@example.com",
  address: "14 Larkspur Lane\nPortland, OR 97214",
  plan: "night-shift",
  grind: "Filter",
  notifications: { roastDay: true, brewTips: false, newOrigins: true },
}

/**
 * Account settings, on shadcn's Field + React Hook Form + Zod pattern. Saving
 * is fake: a valid submit shows a focused "saved" message, which clears as
 * soon as any field changes. `method="post"` keeps a pre-hydration submit out
 * of the URL.
 */
export function SettingsForm() {
  const [saved, setSaved] = useState(false)
  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: current,
  })

  return (
    <form
      method="post"
      noValidate
      onSubmit={form.handleSubmit(
        () => setSaved(true),
        () => setSaved(false)
      )}
      // Text fields and the select bubble a native change event; the Base UI
      // controls below clear the message from their own change callbacks.
      onChange={() => setSaved(false)}
    >
      <FieldGroup>
        <FieldSet>
          <FieldLegend>Profile</FieldLegend>
          <FieldDescription>
            How we address your box and your receipts.
          </FieldDescription>
          <FieldGroup className="grid gap-6 md:grid-cols-2">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="settings-name">Name</FieldLabel>
                  <Input
                    {...field}
                    id="settings-name"
                    autoComplete="name"
                    aria-invalid={fieldState.invalid}
                    aria-describedby={
                      fieldState.invalid ? "settings-name-error" : undefined
                    }
                  />
                  {fieldState.invalid && (
                    <FieldError
                      id="settings-name-error"
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
                  <FieldLabel htmlFor="settings-email">Email</FieldLabel>
                  <Input
                    {...field}
                    id="settings-email"
                    type="email"
                    autoComplete="email"
                    aria-invalid={fieldState.invalid}
                    aria-describedby={
                      fieldState.invalid ? "settings-email-error" : undefined
                    }
                  />
                  {fieldState.invalid && (
                    <FieldError
                      id="settings-email-error"
                      errors={[fieldState.error]}
                    />
                  )}
                </Field>
              )}
            />
            <Controller
              name="address"
              control={form.control}
              render={({ field }) => (
                <Field className="md:col-span-2">
                  <FieldLabel htmlFor="settings-address">
                    Delivery address
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id="settings-address"
                    autoComplete="street-address"
                    rows={3}
                  />
                </Field>
              )}
            />
          </FieldGroup>
        </FieldSet>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend>Subscription</FieldLegend>
          <FieldDescription>
            Changes apply from your next roast. Prices are per month, billed
            monthly.
          </FieldDescription>
          <Controller
            name="plan"
            control={form.control}
            render={({ field }) => (
              <RadioGroup
                name={field.name}
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value)
                  setSaved(false)
                }}
                className="grid gap-3 md:grid-cols-3"
              >
                {plans.map((plan) => (
                  <FieldLabel key={plan.id} htmlFor={`plan-${plan.id}`}>
                    <Field orientation="horizontal">
                      <FieldContent>
                        <FieldTitle>
                          {plan.name} · {formatPrice(plan.monthly)}
                        </FieldTitle>
                        <FieldDescription>{plan.description}</FieldDescription>
                      </FieldContent>
                      <RadioGroupItem value={plan.id} id={`plan-${plan.id}`} />
                    </Field>
                  </FieldLabel>
                ))}
              </RadioGroup>
            )}
          />
          <Controller
            name="grind"
            control={form.control}
            render={({ field }) => (
              <Field className="max-w-xs">
                <FieldLabel htmlFor="settings-grind">Grind</FieldLabel>
                <NativeSelect {...field} id="settings-grind">
                  {GRINDS.map((grind) => (
                    <NativeSelectOption key={grind} value={grind}>
                      {grind}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldDescription>We grind on roast day.</FieldDescription>
              </Field>
            )}
          />
        </FieldSet>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend>Notifications</FieldLegend>
          <FieldGroup className="gap-4">
            {NOTIFICATIONS.map((item) => (
              <Controller
                key={item.id}
                name={`notifications.${item.id}`}
                control={form.control}
                render={({ field }) => (
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldLabel htmlFor={`notify-${item.id}`}>
                        {item.label}
                      </FieldLabel>
                      <FieldDescription id={`notify-${item.id}-description`}>
                        {item.description}
                      </FieldDescription>
                    </FieldContent>
                    <Switch
                      id={`notify-${item.id}`}
                      name={field.name}
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked)
                        setSaved(false)
                      }}
                      aria-describedby={`notify-${item.id}-description`}
                    />
                  </Field>
                )}
              />
            ))}
          </FieldGroup>
        </FieldSet>

        <Field orientation="horizontal" className="items-center">
          <Button type="submit">Save changes</Button>
          <p role="status" className="text-sm text-muted-foreground">
            {saved && (
              <span ref={focusOnMount} tabIndex={-1} className="outline-none">
                Settings saved.
              </span>
            )}
          </p>
        </Field>
      </FieldGroup>
    </form>
  )
}
