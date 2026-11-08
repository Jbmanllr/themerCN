import { DateLib, type labelDayButton } from "react-day-picker"

// react-day-picker names a day "June 1st" while its button shows "1", which
// fails WCAG 2.5.3 (Label in Name). The stock Calendar stays as the CLI wrote
// it, so call sites pass these labels: the same name, with the shown number.
const dayButton: typeof labelDayButton = (
  date,
  modifiers,
  options,
  dateLib
) => {
  const lib = dateLib ?? new DateLib(options)
  const name = lib.format(date, "EEEE, MMMM d, yyyy")
  const dated = modifiers.today ? `Today, ${name}` : name
  return modifiers.selected ? `${dated}, selected` : dated
}

export const calendarLabels = { labelDayButton: dayButton }
