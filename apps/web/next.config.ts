import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
  // `next dev` would otherwise write an untracked apps/web/AGENTS.md when it
  // detects a coding agent; the repo's own AGENTS.md is the agent guide.
  agentRules: false,
}

export default nextConfig
