// Gates the Themer's development-only warnings.

/**
 * Whether the Host app is a production build. Bundlers replace
 * `process.env.NODE_ENV` with a literal; where nothing replaced it and
 * `process` does not exist, the build counts as development.
 */
export function isProduction(): boolean {
  try {
    return process.env.NODE_ENV === "production"
  } catch {
    return false
  }
}
