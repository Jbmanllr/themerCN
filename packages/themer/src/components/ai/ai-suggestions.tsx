"use client";

import * as React from "react";
import { Button } from "@villa/ui/components/button";
import { AI_SUGGESTED_PROMPTS } from "../../types/ai";

interface AISuggestionsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Quick suggestion pills for common AI prompts (AI_SUGGESTED_PROMPTS,
 * types/ai.ts). `onSelect` only reports the pick: AIChat fills the prompt
 * input with it and does not submit.
 */
export function AISuggestions({
  onSelect,
  disabled = false,
  className,
}: AISuggestionsProps) {
  return (
    <div className={className}>
      <p className="text-muted-foreground mb-2 text-xs">Try a suggestion:</p>
      <div className="flex flex-wrap gap-1.5">
        {AI_SUGGESTED_PROMPTS.map((prompt) => (
          <Button
            key={prompt}
            variant="outline"
            size="xs"
            onClick={() => onSelect(prompt)}
            disabled={disabled}
          >
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  );
}
