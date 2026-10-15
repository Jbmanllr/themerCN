"use client"

import {
  CheckIcon,
  FileTextIcon,
  ImageIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"

import { LogoMark } from "@/components/brand/logo"
import { State } from "@/components/design-system/specimen"
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@workspace/ui/components/attachment"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import {
  Bubble,
  BubbleContent,
  BubbleGroup,
  BubbleReactions,
} from "@workspace/ui/components/bubble"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
} from "@workspace/ui/components/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@workspace/ui/components/message-scroller"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@workspace/ui/components/trace"

function AssistantAvatar() {
  return (
    <MessageAvatar>
      <Avatar size="sm">
        <AvatarFallback>
          <LogoMark className="size-4" />
        </AvatarFallback>
      </Avatar>
    </MessageAvatar>
  )
}

export function MessageDemo() {
  return (
    <State label="A question and an answer" className="grid">
      <MessageGroup>
        <Message align="end">
          <MessageContent>
            <Bubble align="end">
              <BubbleContent>How fine should I grind for a V60?</BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
        <Message>
          <AssistantAvatar />
          <MessageContent>
            <MessageHeader>Brew Assistant</MessageHeader>
            <Bubble variant="muted">
              <BubbleContent>
                Medium-fine, like table salt. If it drains in under three
                minutes, go a step finer.
              </BubbleContent>
            </Bubble>
            <MessageFooter>Just now</MessageFooter>
          </MessageContent>
        </Message>
      </MessageGroup>
    </State>
  )
}

const turns = [
  ["end", "What should I try after the Guji?"],
  [
    "start",
    "The Kenya Nyeri: just as bright, with blackcurrant instead of blueberry.",
  ],
  ["end", "And for milk drinks?"],
  ["start", "The house blend. It keeps its chocolate under steamed milk."],
  ["end", "Great, add a bag of each."],
  ["start", "Done. Both ship on Tuesday."],
] as const

export function MessageScrollerDemo() {
  return (
    <State label="Starts at the latest message" className="grid">
      <MessageScrollerProvider defaultScrollPosition="end">
        <MessageScroller className="h-64 rounded-2xl border">
          <MessageScrollerViewport aria-label="Conversation" tabIndex={0}>
            <MessageScrollerContent className="gap-3 p-4">
              {turns.map(([align, text], index) => (
                <MessageScrollerItem key={index}>
                  <Message align={align}>
                    <MessageContent>
                      <Bubble
                        align={align}
                        variant={align === "end" ? "default" : "muted"}
                      >
                        <BubbleContent>{text}</BubbleContent>
                      </Bubble>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              ))}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>
    </State>
  )
}

const bubbleVariants = [
  "default",
  "secondary",
  "muted",
  "tinted",
  "outline",
  "ghost",
  "destructive",
] as const

export function BubbleDemo() {
  return (
    <>
      <State label="Variants" className="grid">
        <BubbleGroup>
          {bubbleVariants.map((variant, index) => (
            <Bubble
              key={variant}
              variant={variant}
              align={index % 2 ? "end" : "start"}
            >
              <BubbleContent>
                {variant[0]!.toUpperCase() + variant.slice(1)}
              </BubbleContent>
            </Bubble>
          ))}
        </BubbleGroup>
      </State>
      <State label="With reactions" className="grid pb-8">
        <Bubble variant="muted">
          <BubbleContent>
            Bloom for 45 seconds before the main pour.
          </BubbleContent>
          <BubbleReactions>
            <span aria-label="Liked">👍 2</span>
          </BubbleReactions>
        </Bubble>
      </State>
    </>
  )
}

export function AttachmentDemo() {
  return (
    <>
      <State label="Done, uploading, error" className="grid">
        <AttachmentGroup>
          <Attachment>
            <AttachmentMedia>
              <FileTextIcon />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>brew-log.pdf</AttachmentTitle>
              <AttachmentDescription>PDF, 120 kB</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove brew-log.pdf">
                <XIcon />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
          <Attachment state="uploading">
            <AttachmentMedia>
              <Spinner />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>grinder.jpg</AttachmentTitle>
              <AttachmentDescription>Uploading</AttachmentDescription>
            </AttachmentContent>
          </Attachment>
          <Attachment state="error">
            <AttachmentMedia>
              <ImageIcon />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>cup.heic</AttachmentTitle>
              <AttachmentDescription>
                Format not supported
              </AttachmentDescription>
            </AttachmentContent>
          </Attachment>
        </AttachmentGroup>
      </State>
      <State label="Small and idle">
        <Attachment size="sm" state="idle">
          <AttachmentMedia>
            <FileTextIcon />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>Drop a file</AttachmentTitle>
          </AttachmentContent>
        </Attachment>
      </State>
    </>
  )
}

export function TraceDemo() {
  return (
    <State label="Done, running, failed and pending steps" className="grid">
      <Trace>
        <div>
          <TraceLine>
            <TraceIcon>
              <CheckIcon />
            </TraceIcon>
            <TraceTitle>Read your brew log</TraceTitle>
            <TraceDescription>0.4 s</TraceDescription>
          </TraceLine>
        </div>
        <TraceCollapsible defaultOpen>
          <TraceCollapsibleTrigger>
            <TraceLine>
              <TraceIcon>
                <SearchIcon />
              </TraceIcon>
              <TraceTitle>Searched the shop for bright coffees</TraceTitle>
            </TraceLine>
          </TraceCollapsibleTrigger>
          <TraceCollapsibleContent>
            Found 3: Kenya Nyeri, Ethiopia Guji, Rwanda Nyamasheke.
          </TraceCollapsibleContent>
        </TraceCollapsible>
        <div>
          <TraceLine status="running">
            <TraceIcon>
              <Spinner />
            </TraceIcon>
            <TraceTitle>Comparing roast dates</TraceTitle>
          </TraceLine>
        </div>
        <div>
          <TraceLine status="error">
            <TraceIcon>
              <XIcon />
            </TraceIcon>
            <TraceTitle>Could not reach the stock service</TraceTitle>
          </TraceLine>
        </div>
        <div>
          <TraceLine status="pending">
            <TraceTitle>Write a recommendation</TraceTitle>
          </TraceLine>
        </div>
      </Trace>
    </State>
  )
}
