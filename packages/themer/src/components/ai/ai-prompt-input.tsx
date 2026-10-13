"use client";

// The AI prompt box: a textarea plus image attachments (file picker, drop and
// paste), read as data URLs.
//
// Contract: the draft text and images live in the AI store, not in local
// state, so a suggestion can fill the box through `setInput`. Enter submits
// and Shift+Enter adds a line; a submit clears both the text and the images.

import * as React from "react";
import { ImageIcon, Send } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@villa/ui/components/input-group";
import { cn } from "@villa/ui/lib/utils";
import { useAIStore } from "../../stores/ai-store";
import { ImageAttachments } from "./image-attachments";

interface AIPromptInputProps {
  onSubmit: (prompt: string, images: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * AI prompt input with image upload support
 */
export function AIPromptInput({
  onSubmit,
  placeholder = "Describe your theme...",
  disabled = false,
  className,
}: AIPromptInputProps) {
  const { currentInput, uploadedImages } = useAIStore(
    useShallow((state) => ({
      currentInput: state.currentInput,
      uploadedImages: state.uploadedImages,
    })),
  );
  const setInput = useAIStore((state) => state.setInput);
  const addImage = useAIStore((state) => state.addImage);
  const removeImage = useAIStore((state) => state.removeImage);
  const clearImages = useAIStore((state) => state.clearImages);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const dropZoneRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInput.trim() && uploadedImages.length === 0) return;
    onSubmit(currentInput, uploadedImages);
    setInput("");
    clearImages();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          addImage(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            if (dataUrl) {
              addImage(dataUrl);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-3", className)}>
      <ImageAttachments
        images={uploadedImages}
        altPrefix="Upload"
        onRemove={removeImage}
      />

      {/* Input area */}
      <div
        ref={dropZoneRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "rounded-lg border-2 border-dashed transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-transparent",
        )}
      >
        <InputGroup>
          <InputGroupTextarea
            ref={textareaRef}
            rows={3}
            value={currentInput}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            disabled={disabled}
            className="min-h-20"
          />
          <InputGroupAddon align="block-end">
            <InputGroupButton
              size="icon-xs"
              aria-label="Upload image"
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon />
            </InputGroupButton>
            <InputGroupButton
              type="submit"
              variant="default"
              size="sm"
              className="ms-auto"
              disabled={
                disabled ||
                (!currentInput.trim() && uploadedImages.length === 0)
              }
            >
              <Send data-icon="inline-start" />
              Send
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        {/* Outside the InputGroup: a click on its addon focuses the group's
            first <input>, and this hidden picker is not the field. */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
      </div>

      {/* Drop hint */}
      {isDragging && (
        <div className="text-muted-foreground text-center text-sm">
          Drop image to upload
        </div>
      )}
    </form>
  );
}
