"use client"

import { useState, type FormEvent } from "react"

import { formatPrice } from "@/lib/format"
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
    id: "roast-day",
    label: "Roast day",
    description: "An email when your coffee comes out of the roaster.",
    on: true,
  },
  {
    id: "brew-tips",
    label: "Brew tips",
    description: "One short guide a fortnight, matched to your brewer.",
    on: false,
  },
  {
    id: "new-origins",
    label: "New origins",
    description: "First pick of limited lots before they reach the shop.",
    on: true,
  },
]

/** Account settings. Saving is fake: the form checks the name, then confirms. */
export function SettingsForm() {
  const [nameError, setNameError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = String(new FormData(event.currentTarget).get("name") ?? "")
    if (!name.trim()) {
      setNameError("Enter your name.")
      setSaved(false)
      document.getElementById("settings-name")?.focus()
      return
    }
    setNameError(null)
    setSaved(true)
  }

  return (
    <form noValidate onSubmit={onSubmit} onChange={() => setSaved(false)}>
      <FieldGroup>
        <FieldSet>
          <FieldLegend>Profile</FieldLegend>
          <FieldDescription>
            How we address your box and your receipts.
          </FieldDescription>
          <FieldGroup className="grid gap-6 md:grid-cols-2">
            <Field data-invalid={nameError ? true : undefined}>
              <FieldLabel htmlFor="settings-name">Name</FieldLabel>
              <Input
                id="settings-name"
                name="name"
                autoComplete="name"
                defaultValue="Ada Brennan"
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? "settings-name-error" : undefined}
              />
              {nameError && (
                <FieldError id="settings-name-error">{nameError}</FieldError>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="settings-email">Email</FieldLabel>
              <Input
                id="settings-email"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue="ada@example.com"
              />
            </Field>
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="settings-address">
                Delivery address
              </FieldLabel>
              <Textarea
                id="settings-address"
                name="address"
                autoComplete="street-address"
                rows={3}
                defaultValue={"14 Larkspur Lane\nPortland, OR 97214"}
              />
            </Field>
          </FieldGroup>
        </FieldSet>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend>Subscription</FieldLegend>
          <FieldDescription>
            Changes apply from your next roast. Prices are per month, billed
            monthly.
          </FieldDescription>
          <RadioGroup
            name="plan"
            defaultValue="night-shift"
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
          <Field className="max-w-xs">
            <FieldLabel htmlFor="settings-grind">Grind</FieldLabel>
            <NativeSelect
              id="settings-grind"
              name="grind"
              defaultValue="Filter"
            >
              {GRINDS.map((grind) => (
                <NativeSelectOption key={grind} value={grind}>
                  {grind}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldDescription>We grind on roast day.</FieldDescription>
          </Field>
        </FieldSet>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend>Notifications</FieldLegend>
          <FieldGroup className="gap-4">
            {NOTIFICATIONS.map((item) => (
              <Field key={item.id} orientation="horizontal">
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
                  name={item.id}
                  defaultChecked={item.on}
                  aria-describedby={`notify-${item.id}-description`}
                  onCheckedChange={() => setSaved(false)}
                />
              </Field>
            ))}
          </FieldGroup>
        </FieldSet>

        <Field orientation="horizontal" className="items-center">
          <Button type="submit">Save changes</Button>
          <p role="status" className="text-sm text-muted-foreground">
            {saved ? "Settings saved." : ""}
          </p>
        </Field>
      </FieldGroup>
    </form>
  )
}
