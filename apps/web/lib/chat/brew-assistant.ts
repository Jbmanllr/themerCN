// The Brew Assistant's stand-in for a model: a message is answered by the
// first scripted reply whose pattern matches it (lib/mock/chat.ts), and the
// reply is streamed one block at a time. No clock, no randomness: the same
// message always produces the same blocks with the same delays.
import { scriptedReplies } from "../mock/chat"
import type { Block, ScriptedReply } from "../mock/types"

/** The scripted reply for `message`; the fallback when no pattern matches. */
export function answer(message: string): ScriptedReply {
  const reply =
    scriptedReplies.find(
      (candidate) =>
        candidate.match !== "fallback" && candidate.match.test(message)
    ) ?? scriptedReplies.find((candidate) => candidate.match === "fallback")
  if (!reply) throw new Error("The Brew Assistant needs a fallback reply.")
  return reply
}

/**
 * Calls `onBlock` with each of the reply's blocks, `delayMs` apart (the first
 * one too). Resolves `true` when every block was emitted, `false` when
 * `signal` aborted the stream first.
 */
export async function streamReply(
  reply: ScriptedReply,
  onBlock: (block: Block) => void,
  signal?: AbortSignal
): Promise<boolean> {
  for (const block of reply.reply) {
    await new Promise((resolve) => setTimeout(resolve, reply.delayMs))
    if (signal?.aborted) return false
    onBlock(block)
  }
  return true
}
