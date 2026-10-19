"use client"

import type { ReactNode } from "react"
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"

/**
 * One text field of a Playground form, on shadcn's Field + React Hook Form
 * pattern (https://ui.shadcn.com/docs/forms/react-hook-form): a Controller
 * rendering Field, its label, the control and its error. The control is
 * described by its error while it has one, else by its hint (`description`),
 * so each form gets the same accessible wiring.
 */
export function TextField<T extends FieldValues>({
  control,
  name,
  id,
  label,
  description,
  className,
  ...input
}: {
  control: Control<T>
  name: FieldPath<T>
  /** The control's id; the error and hint ids derive from it. */
  id: string
  label: string
  description?: ReactNode
  className?: string
} & (
  | {
      multiline?: false
      type?: "text" | "email" | "password"
      autoComplete?: string
      placeholder?: string
    }
  | { multiline: true; rows?: number; autoComplete?: string }
)) {
  const errorId = `${id}-error`
  const descriptionId = `${id}-description`
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const described = fieldState.invalid
          ? errorId
          : description
            ? descriptionId
            : undefined
        const props = {
          ...field,
          id,
          "aria-invalid": fieldState.invalid,
          "aria-describedby": described,
        }
        return (
          <Field data-invalid={fieldState.invalid} className={className}>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            {input.multiline ? (
              <Textarea
                {...props}
                rows={input.rows}
                autoComplete={input.autoComplete}
              />
            ) : (
              <Input
                {...props}
                type={input.type ?? "text"}
                autoComplete={input.autoComplete}
                placeholder={input.placeholder}
              />
            )}
            {fieldState.invalid ? (
              <FieldError id={errorId} errors={[fieldState.error]} />
            ) : (
              description && (
                <FieldDescription id={descriptionId}>
                  {description}
                </FieldDescription>
              )
            )}
          </Field>
        )
      }}
    />
  )
}
