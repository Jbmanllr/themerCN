"use client"

import { MailIcon, SearchIcon } from "lucide-react"
import { useId, useState } from "react"

import { State } from "@/components/design-system/specimen"
import { Calendar } from "@workspace/ui/components/calendar"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@workspace/ui/components/combobox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@workspace/ui/components/input-group"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@workspace/ui/components/input-otp"
import { Label } from "@workspace/ui/components/label"
import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@workspace/ui/components/questionnaire"
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Slider } from "@workspace/ui/components/slider"
import { Switch } from "@workspace/ui/components/switch"
import { Textarea } from "@workspace/ui/components/textarea"

const origins = [
  "Brazil",
  "Colombia",
  "Ethiopia",
  "Guatemala",
  "Kenya",
  "Rwanda",
] as const

export function InputDemo() {
  const id = useId()
  return (
    <>
      <State label="Empty, filled and disabled" className="grid">
        <Input aria-label="Name" placeholder="Your name" />
        <Input aria-label="Email" type="email" defaultValue="ada@example.com" />
        <Input aria-label="Gift code" placeholder="Gift code" disabled />
      </State>
      <State label="Invalid, with a label" className="grid">
        <Label htmlFor={`${id}-postcode`}>Postcode</Label>
        <Input id={`${id}-postcode`} defaultValue="N1 9" aria-invalid />
      </State>
      <State label="File">
        <Input aria-label="Receipt" type="file" />
      </State>
    </>
  )
}

export function InputGroupDemo() {
  return (
    <>
      <State label="Icon and button" className="grid">
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput aria-label="Search" placeholder="Search beans" />
          <InputGroupAddon align="inline-end">
            <InputGroupButton>Search</InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </State>
      <State label="Text before and after" className="grid">
        <InputGroup>
          <InputGroupAddon>
            <InputGroupText>£</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput aria-label="Tip" defaultValue="2.50" />
          <InputGroupAddon align="inline-end">
            <InputGroupText>GBP</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
        <InputGroup>
          <InputGroupAddon>
            <MailIcon />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Email"
            defaultValue="not-an-email"
            aria-invalid
          />
        </InputGroup>
      </State>
    </>
  )
}

export function InputOtpDemo() {
  return (
    <>
      <State label="Partly filled">
        <InputOTP maxLength={6} defaultValue="314" aria-label="Sign-in code">
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </State>
      <State label="Disabled">
        <InputOTP maxLength={4} disabled aria-label="Order code">
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
          </InputOTPGroup>
        </InputOTP>
      </State>
    </>
  )
}

export function TextareaDemo() {
  return (
    <>
      <State label="Empty and filled" className="grid">
        <Textarea aria-label="Delivery note" placeholder="Leave it with…" />
        <Textarea
          aria-label="Tasting notes"
          defaultValue="Stone fruit, black tea, a long cocoa finish."
        />
      </State>
      <State label="Invalid and disabled" className="grid">
        <Textarea aria-label="Review" defaultValue="Ok" aria-invalid />
        <Textarea aria-label="Locked note" defaultValue="Locked" disabled />
      </State>
    </>
  )
}

export function LabelDemo() {
  const id = useId()
  return (
    <>
      <State label="With an input" className="grid">
        <Label htmlFor={`${id}-name`}>Name on the bag</Label>
        <Input id={`${id}-name`} placeholder="Ada" />
      </State>
      <State label="With a checkbox">
        <Checkbox id={`${id}-gift`} />
        <Label htmlFor={`${id}-gift`}>This is a gift</Label>
      </State>
    </>
  )
}

export function FieldDemo() {
  const id = useId()
  return (
    <>
      <State label="Label, control and description" className="grid">
        <Field>
          <FieldLabel htmlFor={`${id}-name`}>Name</FieldLabel>
          <Input id={`${id}-name`} placeholder="Ada Lovelace" />
          <FieldDescription>Printed on the delivery label.</FieldDescription>
        </Field>
      </State>
      <State label="Invalid" className="grid">
        <Field data-invalid>
          <FieldLabel htmlFor={`${id}-email`}>Email</FieldLabel>
          <Input id={`${id}-email`} defaultValue="ada@" aria-invalid />
          <FieldError>Enter an email address like ada@example.com.</FieldError>
        </Field>
      </State>
      <State label="A fieldset, horizontal fields" className="grid">
        <FieldSet>
          <FieldLegend>Notifications</FieldLegend>
          <FieldGroup>
            <Field orientation="horizontal">
              <Switch id={`${id}-ship`} defaultChecked />
              <FieldContent>
                <FieldLabel htmlFor={`${id}-ship`}>Shipping updates</FieldLabel>
                <FieldDescription>When your order leaves.</FieldDescription>
              </FieldContent>
            </Field>
            <Field orientation="horizontal">
              <Switch id={`${id}-roast`} />
              <FieldContent>
                <FieldLabel htmlFor={`${id}-roast`}>New roasts</FieldLabel>
                <FieldDescription>Once a month at most.</FieldDescription>
              </FieldContent>
            </Field>
          </FieldGroup>
        </FieldSet>
      </State>
    </>
  )
}

export function CheckboxDemo() {
  const id = useId()
  return (
    <>
      <State label="Unchecked, checked, indeterminate">
        <Checkbox aria-label="Unchecked" />
        <Checkbox aria-label="Checked" defaultChecked />
        <Checkbox aria-label="Some selected" indeterminate />
      </State>
      <State label="With labels, invalid and disabled" className="grid">
        <div className="flex items-center gap-2">
          <Checkbox id={`${id}-grind`} defaultChecked />
          <Label htmlFor={`${id}-grind`}>Grind it for me</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id={`${id}-terms`} aria-invalid />
          <Label htmlFor={`${id}-terms`}>I accept the terms</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id={`${id}-gift`} disabled />
          <Label htmlFor={`${id}-gift`}>Gift wrap (sold out)</Label>
        </div>
      </State>
    </>
  )
}

export function RadioGroupDemo() {
  const id = useId()
  const options = [
    ["whole", "Whole bean"],
    ["filter", "Ground for filter"],
    ["espresso", "Ground for espresso"],
  ] as const
  return (
    <>
      <State label="One selected" className="grid">
        <RadioGroup defaultValue="filter" aria-label="Grind">
          {options.map(([value, label]) => (
            <div key={value} className="flex items-center gap-2">
              <RadioGroupItem value={value} id={`${id}-${value}`} />
              <Label htmlFor={`${id}-${value}`}>{label}</Label>
            </div>
          ))}
        </RadioGroup>
      </State>
      <State label="Disabled" className="grid">
        <RadioGroup defaultValue="whole" aria-label="Grind" disabled>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="whole" id={`${id}-d-whole`} />
            <Label htmlFor={`${id}-d-whole`}>Whole bean</Label>
          </div>
        </RadioGroup>
      </State>
    </>
  )
}

export function SwitchDemo() {
  const id = useId()
  return (
    <>
      <State label="Off and on">
        <Switch aria-label="Off" />
        <Switch aria-label="On" defaultChecked />
      </State>
      <State label="Small, with a label, disabled" className="grid">
        <div className="flex items-center gap-2">
          <Switch id={`${id}-pause`} size="sm" defaultChecked />
          <Label htmlFor={`${id}-pause`}>Pause my subscription</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id={`${id}-locked`} disabled />
          <Label htmlFor={`${id}-locked`}>Locked</Label>
        </div>
      </State>
    </>
  )
}

export function SliderDemo() {
  return (
    <>
      <State label="A value" className="grid">
        <Slider defaultValue={[60]} aria-label="Strength" />
      </State>
      <State label="A range" className="grid">
        <Slider defaultValue={[20, 80]} aria-label="Price range" />
      </State>
      <State label="Disabled" className="grid">
        <Slider defaultValue={[30]} disabled aria-label="Locked" />
      </State>
    </>
  )
}

const roastItems = [
  { label: "Pick a roast", value: null },
  { label: "Light", value: "light" },
  { label: "Medium", value: "medium" },
  { label: "Dark", value: "dark" },
]

export function SelectDemo() {
  return (
    <>
      <State label="Placeholder and chosen">
        <Select items={roastItems}>
          <SelectTrigger aria-label="Roast" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {roastItems.map((item) => (
                <SelectItem key={item.label} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select items={roastItems} defaultValue="medium">
          <SelectTrigger aria-label="Roast" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {roastItems.map((item) => (
                <SelectItem key={item.label} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </State>
      <State label="Small, invalid and disabled">
        <Select items={roastItems}>
          <SelectTrigger aria-label="Roast" size="sm" aria-invalid>
            <SelectValue />
          </SelectTrigger>
          <SelectContent />
        </Select>
        <Select items={roastItems} disabled>
          <SelectTrigger aria-label="Roast" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent />
        </Select>
      </State>
    </>
  )
}

export function NativeSelectDemo() {
  return (
    <>
      <State label="Default and small">
        <NativeSelect aria-label="Bag size" defaultValue="500">
          <NativeSelectOption value="250">250 g</NativeSelectOption>
          <NativeSelectOption value="500">500 g</NativeSelectOption>
          <NativeSelectOption value="1000">1 kg</NativeSelectOption>
        </NativeSelect>
        <NativeSelect aria-label="Bag size" size="sm" defaultValue="250">
          <NativeSelectOption value="250">250 g</NativeSelectOption>
          <NativeSelectOption value="500">500 g</NativeSelectOption>
        </NativeSelect>
      </State>
      <State label="Invalid and disabled">
        <NativeSelect aria-label="Country" aria-invalid defaultValue="">
          <NativeSelectOption value="">Choose a country</NativeSelectOption>
          <NativeSelectOption value="uk">United Kingdom</NativeSelectOption>
        </NativeSelect>
        <NativeSelect aria-label="Locked" disabled>
          <NativeSelectOption>Locked</NativeSelectOption>
        </NativeSelect>
      </State>
    </>
  )
}

export function ComboboxDemo() {
  return (
    <>
      <State label="Type to filter; opens a list">
        <Combobox items={origins}>
          <ComboboxInput aria-label="Origin" placeholder="Choose an origin" />
          <ComboboxContent>
            <ComboboxEmpty>No origin matches.</ComboboxEmpty>
            <ComboboxList>
              {(item: string) => (
                <ComboboxItem key={item} value={item}>
                  {item}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </State>
      <State label="Chosen, disabled">
        <Combobox items={origins} defaultValue="Kenya">
          <ComboboxInput aria-label="Origin" />
          <ComboboxContent />
        </Combobox>
        <Combobox items={origins}>
          <ComboboxInput aria-label="Origin" placeholder="Locked" disabled />
          <ComboboxContent />
        </Combobox>
      </State>
    </>
  )
}

// A fixed month, so the specimen is the same on every visit.
const MONTH = new Date(2026, 9, 1)

export function CalendarDemo() {
  const [day, setDay] = useState<Date | undefined>(new Date(2026, 9, 14))
  const [range, setRange] = useState<
    { from: Date | undefined; to?: Date | undefined } | undefined
  >({ from: new Date(2026, 9, 6), to: new Date(2026, 9, 10) })
  return (
    <>
      <State label="One day">
        <Calendar
          mode="single"
          defaultMonth={MONTH}
          selected={day}
          onSelect={setDay}
          className="rounded-2xl border"
        />
      </State>
      <State label="A range">
        <Calendar
          mode="range"
          defaultMonth={MONTH}
          selected={range}
          onSelect={setRange}
          className="rounded-2xl border"
        />
      </State>
    </>
  )
}

export function QuestionnaireDemo() {
  return (
    <State label="One question at a time" className="grid">
      <Questionnaire
        aria-label="Find your coffee"
        onSubmit={(event) => event.preventDefault()}
      >
        <QuestionnaireProgress />
        <QuestionnaireItem name="brew">
          <QuestionnaireTitle>How do you brew?</QuestionnaireTitle>
          <QuestionnaireDescription>
            We grind to suit it.
          </QuestionnaireDescription>
          <QuestionnaireChoices>
            <QuestionnaireChoice value="filter">Filter</QuestionnaireChoice>
            <QuestionnaireChoice value="espresso">Espresso</QuestionnaireChoice>
            <QuestionnaireChoice value="cafetiere">
              Cafetière
            </QuestionnaireChoice>
          </QuestionnaireChoices>
        </QuestionnaireItem>
        <QuestionnaireItem name="taste">
          <QuestionnaireTitle>What do you like in a cup?</QuestionnaireTitle>
          <QuestionnaireChoices>
            <QuestionnaireChoice value="fruit">
              Bright and fruity
            </QuestionnaireChoice>
            <QuestionnaireChoice value="choc">
              Chocolate and nuts
            </QuestionnaireChoice>
          </QuestionnaireChoices>
        </QuestionnaireItem>
        <QuestionnaireActions>
          <QuestionnairePrevious />
          <QuestionnaireNext />
          <QuestionnaireSubmit>See my match</QuestionnaireSubmit>
        </QuestionnaireActions>
      </Questionnaire>
    </State>
  )
}
