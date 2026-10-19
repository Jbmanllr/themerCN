"use client"

import { ArrowUpIcon } from "lucide-react"
import {
  useEffect,
  useRef,
  useState,
  type SubmitEvent,
  type KeyboardEvent,
} from "react"

import { Blocks } from "@/components/blocks/blocks"
import { LogoMark } from "@/components/brand/logo"
import { Illustration } from "@/components/illustrations/illustration"
import { answer, streamReply } from "@/lib/chat/brew-assistant"
import { formatDate } from "@/lib/format"
import type { ChatMessage, ChatThread } from "@/lib/mock"
import { Bubble, BubbleContent } from "@workspace/ui/components/bubble"
import { Button } from "@workspace/ui/components/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@workspace/ui/components/input-group"
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@workspace/ui/components/message"

const SUGGESTIONS = [
  "Why is my espresso sour?",
  "What ratio for a V60?",
  "Is decaf any good?",
  "A gift for a coffee lover",
]

/**
 * The Brew Assistant: a saved thread (or a new chat) plus a composer. Sent
 * messages get the matching scripted reply, streamed block by block.
 */
export function ChatView({ thread }: { thread?: ChatThread }) {
  const title = thread?.title ?? "New chat"
  const [messages, setMessages] = useState<ChatMessage[]>(
    thread?.messages ?? []
  )
  const [draft, setDraft] = useState("")
  const [streaming, setStreaming] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  useEffect(() => {
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [messages])

  async function send(text: string) {
    const message = text.trim()
    if (!message || streaming) return
    setDraft("")
    setStreaming(true)
    setMessages((current) => [
      ...current,
      { role: "user", content: [{ type: "p", text: message }] },
      { role: "assistant", content: [] },
    ])
    const controller = new AbortController()
    abortRef.current = controller
    await streamReply(
      answer(message),
      (block) =>
        setMessages((current) => {
          const last = current.at(-1)
          if (!last) return current
          return [
            ...current.slice(0, -1),
            { ...last, content: [...last.content, block] },
          ]
        }),
      controller.signal
    )
    if (!controller.signal.aborted) setStreaming(false)
  }

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    void send(draft)
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      void send(draft)
    }
  }

  return (
    <div className="flex h-[calc(100svh-3.5rem)] flex-col">
      <div className="flex items-baseline justify-between gap-4 border-b px-4 py-3 md:px-8">
        <h2 className="truncate font-heading text-xl">{title}</h2>
        {thread && (
          <p className="shrink-0 text-xs text-muted-foreground">
            Updated {formatDate(thread.updatedAt)}
          </p>
        )}
      </div>

      <div
        ref={logRef}
        role="log"
        aria-label={title}
        aria-busy={streaming}
        className="flex-1 overflow-y-auto"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-8">
          {messages.length === 0 ? (
            <NewChat onPick={(text) => void send(text)} />
          ) : (
            messages.map((message, index) => (
              <ChatMessageView
                key={index}
                message={message}
                pending={streaming && index === messages.length - 1}
              />
            ))
          )}
        </div>
      </div>

      <div className="border-t bg-background px-4 py-4 md:px-8">
        <form onSubmit={onSubmit} className="mx-auto w-full max-w-3xl">
          <InputGroup>
            <InputGroupTextarea
              aria-label="Message the Brew Assistant"
              placeholder="Ask about grind, ratios, beans…"
              rows={1}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
              className="max-h-40 min-h-12"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                type="submit"
                variant="default"
                size="icon-sm"
                aria-label="Send"
                disabled={streaming || !draft.trim()}
              >
                <ArrowUpIcon />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            The Brew Assistant answers from a script: no model, no data leaves
            the page.
          </p>
        </form>
      </div>
    </div>
  )
}

function ChatMessageView({
  message,
  pending,
}: {
  message: ChatMessage
  pending: boolean
}) {
  if (message.role === "user") {
    return (
      <Message align="end">
        <MessageContent>
          <Bubble align="end" variant="tinted">
            <BubbleContent>
              <span className="sr-only">You: </span>
              <Blocks blocks={message.content} size="sm" />
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    )
  }
  return (
    <Message>
      <MessageAvatar className="size-8 self-start bg-primary/10 text-primary">
        <LogoMark className="size-5" />
      </MessageAvatar>
      <MessageContent className="pt-1">
        <span className="sr-only">Brew Assistant: </span>
        <Blocks blocks={message.content} size="sm" />
        {pending && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex gap-1" aria-hidden>
              <span className="size-1.5 animate-pulse rounded-full bg-primary" />
              <span className="size-1.5 animate-pulse rounded-full bg-primary [animation-delay:150ms]" />
              <span className="size-1.5 animate-pulse rounded-full bg-primary [animation-delay:300ms]" />
            </span>
            Brewing a reply…
          </p>
        )}
      </MessageContent>
    </Message>
  )
}

function NewChat({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-6 py-10 text-center">
      <Illustration seed="dripper" className="size-36" />
      <div className="flex flex-col gap-2">
        <p className="font-heading text-2xl">What are you brewing tonight?</p>
        <p className="max-w-md text-muted-foreground">
          Ask about grind size, ratios or which beans to try next. Start with
          one of these:
        </p>
      </div>
      <div className="flex max-w-lg flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <Button
            key={suggestion}
            variant="outline"
            size="sm"
            onClick={() => onPick(suggestion)}
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  )
}
