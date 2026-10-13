"use client";

// One chat message: bubble, image thumbnails, the generated theme's swatches,
// and the Edit, Retry and Apply Theme actions.
//
// Contract: an action renders only when AIChat passes its handler (AIChat
// withholds Edit and Retry while a generation runs). Edit belongs to user
// messages; Retry to assistant and error messages.

import * as React from "react";
import { RotateCw } from "lucide-react";
import { Avatar, AvatarFallback } from "@villa/ui/components/avatar";
import { Bubble, BubbleContent } from "@villa/ui/components/bubble";
import { Button } from "@villa/ui/components/button";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
} from "@villa/ui/components/message";
import { Textarea } from "@villa/ui/components/textarea";
import { cn } from "@villa/ui/lib/utils";
import type { AIMessage } from "../../types/ai";
import { ImageAttachments } from "./image-attachments";

interface AIMessageProps {
  message: AIMessage;
  onRetry?: () => void;
  onEdit?: (content: string) => void;
  onApply?: () => void;
  className?: string;
}

/**
 * Edit mode for a message: the draft, and a toggle that saves a changed draft
 * on leaving edit mode and focuses the textarea (caret at the end) on entering.
 */
function useMessageEdit(content: string, onEdit?: (content: string) => void) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editContent, setEditContent] = React.useState(content);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleEdit = () => {
    if (isEditing && editContent !== content) {
      onEdit?.(editContent);
    }
    const willBeEditing = !isEditing;
    setIsEditing(willBeEditing);

    // The textarea mounts with this state change, so focus it a frame later.
    if (willBeEditing) {
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.selectionStart = textareaRef.current.value.length;
        }
      });
    }
  };

  return { isEditing, editContent, setEditContent, textareaRef, handleEdit };
}

/**
 * The message actions show while the row is hovered or holds focus (Button's
 * own transition fades them).
 */
const MESSAGE_ACTION_REVEAL =
  "opacity-0 group-focus-within/message:opacity-100 group-hover/message:opacity-100";

/**
 * Individual AI chat message with edit/retry capabilities
 */
export function AIMessageItem({
  message,
  onRetry,
  onEdit,
  onApply,
  className,
}: AIMessageProps) {
  const { isEditing, editContent, setEditContent, textareaRef, handleEdit } =
    useMessageEdit(message.content, onEdit);

  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const isError = message.role === "error";

  return (
    <Message align={isUser ? "end" : "start"} className={className}>
      <MessageAvatar>
        <RoleAvatar role={message.role} />
      </MessageAvatar>
      <MessageContent>
        {/* An image-only prompt has no text: its images stand alone. */}
        {isEditing || message.content.trim() ? (
          <Bubble
            variant={isUser ? "default" : isError ? "destructive" : "muted"}
          >
            <BubbleContent className="whitespace-pre-wrap">
              {isEditing ? (
                <Textarea
                  ref={textareaRef}
                  rows={3}
                  aria-label="Edit message"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="bg-background/50 text-foreground dark:bg-background/50 min-w-60 resize-none"
                />
              ) : (
                message.content
              )}
            </BubbleContent>
          </Bubble>
        ) : null}

        <ImageAttachments images={message.images} altPrefix="Attached" />

        <ThemeResultPreview
          themeResult={message.themeResult}
          onApply={onApply}
        />

        <MessageFooter className="gap-2">
          {formatTime(message.timestamp)}
          {isUser && onEdit && (
            <Button
              variant="ghost"
              size="xs"
              onClick={handleEdit}
              className={MESSAGE_ACTION_REVEAL}
            >
              {isEditing ? "Save" : "Edit"}
            </Button>
          )}
          {(isAssistant || isError) && onRetry && (
            <Button
              variant="ghost"
              size="xs"
              onClick={onRetry}
              className={MESSAGE_ACTION_REVEAL}
            >
              <RotateCw data-icon="inline-start" />
              Retry
            </Button>
          )}
        </MessageFooter>
      </MessageContent>
    </Message>
  );
}

const THEME_RESULT_SWATCHES = [
  "primary",
  "secondary",
  "accent",
  "muted",
] as const;

/** The round badge beside a message: "You", "AI", or "!" for an error. */
export function RoleAvatar({ role }: { role: AIMessage["role"] }) {
  return (
    <Avatar>
      <AvatarFallback
        className={cn(
          "text-xs font-medium",
          role === "user"
            ? "bg-secondary text-secondary-foreground"
            : role === "error"
              ? "bg-destructive text-destructive-foreground"
              : "bg-primary text-primary-foreground",
        )}
      >
        {role === "user" ? "You" : role === "error" ? "!" : "AI"}
      </AvatarFallback>
    </Avatar>
  );
}

/**
 * The theme an assistant message generated, if any: four light-mode swatches
 * and, when the chat allows it, the button that applies the theme.
 */
function ThemeResultPreview({
  themeResult,
  onApply,
}: {
  themeResult: AIMessage["themeResult"];
  onApply?: () => void;
}) {
  if (!themeResult) return null;

  return (
    // The slot lets MessageContent align it with the message's side.
    <div data-slot="theme-result" className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium">Theme Generated</span>
        {onApply && (
          <Button size="xs" variant="secondary" onClick={onApply}>
            Apply Theme
          </Button>
        )}
      </div>
      <div className="flex gap-1">
        {THEME_RESULT_SWATCHES.map((color) => (
          <div
            key={color}
            className="h-6 w-6 rounded border"
            style={{ backgroundColor: themeResult.light[color] }}
            title={color}
          />
        ))}
      </div>
    </div>
  );
}

const TIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "numeric",
  hour12: true,
});

function formatTime(date: Date): string {
  // react-doctor-disable-next-line react-doctor/no-locale-format-in-render -- no message exists during a server render: AIChat, the only renderer, reads the in-memory AI store, which starts empty and fills only from submits in the browser, inside the overlay ThemerRoot portals once isClient; the user's local time zone is the intended output, so a fixed timeZone would show the wrong time
  return TIME_FORMAT.format(date);
}
