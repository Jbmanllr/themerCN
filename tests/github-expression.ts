// Evaluates the subset of GitHub Actions expressions ci.yml uses, so the
// tests can ask what a condition decides instead of matching its text:
// `${{ }}` interpolation, string literals, context paths (`github.*`,
// `needs.*`, `steps.*`), `==`, `!=`, `!`, `&&` and `||` (which, as on
// GitHub, return an operand, not a boolean), parentheses and the status
// functions.

export type Status = "success" | "failure" | "cancelled"

export type Context = {
  github?: Record<string, string>
  needs?: Record<string, unknown>
  steps?: Record<string, unknown>
  // The job's status so far: what success(), failure() and cancelled() see.
  status?: Status
}

const STATUS_FUNCTIONS = ["always", "success", "failure", "cancelled"]

const lookup = (context: Context, path: string): unknown => {
  let value: unknown = context
  for (const key of path.split(".")) {
    if (value === null || typeof value !== "object") return ""
    value = (value as Record<string, unknown>)[key]
  }
  return value ?? ""
}

const evalExpression = (source: string, context: Context): unknown => {
  const tokens =
    source.match(/'[^']*'|==|!=|&&|\|\||!|[()]|[\w.-]+\(\)|[\w.-]+/g) ?? []
  let at = 0
  const status = context.status ?? "success"
  const primary = (): unknown => {
    const token = tokens[at++]
    if (token === undefined) throw new Error(`incomplete expression: ${source}`)
    if (token === "(") {
      const value = or()
      if (tokens[at++] !== ")") throw new Error(`unbalanced: ${source}`)
      return value
    }
    if (token === "!") return !primary()
    if (token.startsWith("'")) return token.slice(1, -1)
    if (token.endsWith("()")) {
      const name = token.slice(0, -2)
      if (name === "always") return true
      if (name === "success" || name === "failure" || name === "cancelled")
        return status === name
      throw new Error(`unsupported function: ${token}`)
    }
    if (/^(github|needs|steps)\./.test(token)) return lookup(context, token)
    if (token === "true" || token === "false") return token === "true"
    throw new Error(`unsupported expression token: ${token}`)
  }
  const comparison = (): unknown => {
    const left = primary()
    const op = tokens[at]
    if (op !== "==" && op !== "!=") return left
    at++
    const equal = left === primary()
    return op === "==" ? equal : !equal
  }
  const and = (): unknown => {
    let value = comparison()
    while (tokens[at] === "&&") {
      at++
      const right = comparison()
      value = value ? right : value
    }
    return value
  }
  const or = (): unknown => {
    let value = and()
    while (tokens[at] === "||") {
      at++
      const right = and()
      value = value ? value : right
    }
    return value
  }
  const value = or()
  if (at !== tokens.length) throw new Error(`unsupported expression: ${source}`)
  return value
}

/** The value of a `${{ }}` template, or of a bare expression. */
export function evaluate(template: string, context: Context): unknown {
  const whole = template.match(/^\$\{\{(.*)\}\}$/s)
  if (whole) return evalExpression(whole[1]!, context)
  if (!template.includes("${{")) return evalExpression(template, context)
  return template.replace(/\$\{\{(.*?)\}\}/gs, (_, source: string) =>
    String(evalExpression(source, context))
  )
}

/**
 * Whether a job or step with this `if:` runs. As on GitHub, a condition with
 * no status function runs only while the job so far has succeeded.
 */
export function runsIf(condition: string | undefined, context: Context) {
  if (condition === undefined)
    return (context.status ?? "success") === "success"
  const source = condition.match(/^\$\{\{(.*)\}\}$/s)?.[1] ?? condition
  const checksStatus = STATUS_FUNCTIONS.some((name) =>
    source.includes(`${name}()`)
  )
  const value = Boolean(evaluate(source, context))
  return checksStatus
    ? value
    : value && (context.status ?? "success") === "success"
}
