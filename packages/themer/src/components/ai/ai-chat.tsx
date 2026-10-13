"use client";

// The AI Generate panel's chat: message list, prompt input, starter
// suggestions, and the Apply Theme action.
//
// Contract:
// - The panel shows only when ThemerConfig.showTabAI is true (default false;
//   no Banter host sets it), and generateTheme (src/api/ai-generate.ts) is a
//   mock that calls no AI provider.
// - Retry and Edit regenerate from a prompt already in the chat; they must
//   not add it again as a new user message.
// - Apply Theme goes through the editor store's importThemeStyles with
//   `replace: true`: one undo entry, a new checkpoint, HSL adjustments reset,
//   and tokens the generated theme omits come from the host's default preset
//   (getDefaultPresetId).
// - Messages and images (data URLs) live in the in-memory AI store, which
//   ThemerRoot resets when the editor closes.
//
// See: packages/themer/ARCHITECTURE.md ("AI Generation Flow").

import { Sparkles } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@villa/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@villa/ui/components/empty";
import {
  Marker,
  MarkerContent,
  MarkerIcon,
} from "@villa/ui/components/marker";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@villa/ui/components/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@villa/ui/components/message-scroller";
import { Spinner } from "@villa/ui/components/spinner";
import { cn } from "@villa/ui/lib/utils";
import { useAIStore } from "../../stores/ai-store";
import { useEditorStore } from "../../stores/editor-store";
import { generateTheme } from "../../api/ai-generate";
import { AIPromptInput } from "./ai-prompt-input";
import { AISuggestions } from "./ai-suggestions";
import { AIMessageItem, RoleAvatar } from "./ai-message";
import type { AIMessage, ThemeStyleProps } from "../../types";

interface AIChatProps {
  className?: string;
}

/**
 * AI chat interface for theme generation
 */
export function AIChat({ className }: AIChatProps) {
  const { messages, isLoading } = useAIStore(
    useShallow((state) => ({
      messages: state.messages,
      isLoading: state.isLoading,
    })),
  );
  const addMessage = useAIStore((state) => state.addMessage);
  const updateMessage = useAIStore((state) => state.updateMessage);
  const clearMessages = useAIStore((state) => state.clearMessages);
  const setLoading = useAIStore((state) => state.setLoading);
  const setError = useAIStore((state) => state.setError);
  const setInput = useAIStore((state) => state.setInput);

  // Generates a theme for a prompt that is already in the chat (a new
  // message, a retry or an edit) and appends the answer.
  const generate = async (prompt: string, images: string[]) => {
    setLoading(true);
    setError(null);

    try {
      const response = await generateTheme({
        prompt,
        images,
        currentTheme: useEditorStore.getState().themeState.styles,
      });

      if (response.success && response.theme) {
        const assistantMessage: AIMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.message ?? "Here's your generated theme!",
          themeResult: response.theme,
          timestamp: new Date(),
        };
        addMessage(assistantMessage);
      } else {
        const errorMessage: AIMessage = {
          id: crypto.randomUUID(),
          role: "error",
          content: response.error ?? "Failed to generate theme",
          timestamp: new Date(),
        };
        addMessage(errorMessage);
      }
    } catch (err) {
      const errorMessage: AIMessage = {
        id: crypto.randomUUID(),
        role: "error",
        content:
          err instanceof Error ? err.message : "An unexpected error occurred",
        timestamp: new Date(),
      };
      addMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (prompt: string, images: string[]) => {
    if (!prompt.trim() && images.length === 0) return;

    const userMessage: AIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
      images: images.length > 0 ? images : undefined,
      timestamp: new Date(),
    };
    addMessage(userMessage);

    await generate(prompt, images);
  };

  const handleRetry = async (messageId: string) => {
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) return;

    // Find the preceding user message
    let userMessage: AIMessage | undefined;
    for (let i = messageIndex; i >= 0; i--) {
      if (messages[i]?.role === "user") {
        userMessage = messages[i];
        break;
      }
    }

    if (userMessage) {
      await generate(userMessage.content, userMessage.images ?? []);
    }
  };

  const handleEdit = async (messageId: string, newContent: string) => {
    updateMessage(messageId, { content: newContent });
    // Regenerate from the edited message, without adding a copy of it
    const message = messages.find((m) => m.id === messageId);
    if (message) {
      await generate(newContent, message.images ?? []);
    }
  };

  const handleApplyTheme = (theme: {
    light: ThemeStyleProps;
    dark: ThemeStyleProps;
  }) => {
    // The import transition records history, moves the HSL checkpoint and
    // resets the adjustments, so a later HSL move starts from this theme.
    useEditorStore.getState().importThemeStyles(theme, { replace: true });
  };

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h3 className="font-semibold">AI Theme Generator</h3>
          <p className="text-muted-foreground text-xs">
            Describe your ideal theme or upload inspiration
          </p>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="xs"
            onClick={clearMessages}
            className="text-muted-foreground"
          >
            Clear chat
          </Button>
        )}
      </div>

      {/* Messages */}
      {messages.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Sparkles />
            </EmptyMedia>
            <EmptyTitle>Generate a theme with AI</EmptyTitle>
            <EmptyDescription>
              Describe what you want or upload an image for inspiration
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <AISuggestions
              onSelect={(prompt) => setInput(prompt)}
              disabled={isLoading}
            />
          </EmptyContent>
        </Empty>
      ) : (
        <MessageScrollerProvider autoScroll>
          <MessageScroller className="min-h-0 flex-1">
            <MessageScrollerViewport>
              <MessageScrollerContent className="p-4" aria-busy={isLoading}>
                {messages.map((message) => (
                  <MessageScrollerItem
                    key={message.id}
                    messageId={message.id}
                    scrollAnchor={message.role === "user"}
                  >
                    <AIMessageItem
                      message={message}
                      onRetry={
                        isLoading ? undefined : () => handleRetry(message.id)
                      }
                      onEdit={
                        isLoading
                          ? undefined
                          : (content) => handleEdit(message.id, content)
                      }
                      onApply={
                        message.themeResult
                          ? () => handleApplyTheme(message.themeResult!)
                          : undefined
                      }
                    />
                  </MessageScrollerItem>
                ))}
                {isLoading && (
                  <MessageScrollerItem messageId="pending">
                    <Message>
                      <MessageAvatar>
                        <RoleAvatar role="assistant" />
                      </MessageAvatar>
                      {/* Centred on the avatar, as the status line was. */}
                      <MessageContent className="justify-center">
                        <Marker role="status">
                          <MarkerIcon>
                            <Spinner />
                          </MarkerIcon>
                          <MarkerContent>Generating theme...</MarkerContent>
                        </Marker>
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                )}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>
      )}

      {/* Input */}
      <div className="border-t p-4">
        <AIPromptInput
          onSubmit={handleSubmit}
          placeholder="Describe your theme... (e.g., 'modern dark theme with purple accents')"
          disabled={isLoading}
        />
      </div>
    </div>
  );
}
