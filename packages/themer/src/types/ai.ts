import type { ThemeStyles, ThemeStyleProps, ThemeMode } from "./theme";

/**
 * AI provider types
 */
export type AIProviderType = "openai" | "google" | "anthropic";

/**
 * AI provider configuration
 */
export interface AIProviderConfig {
  type: AIProviderType;
  apiKey?: string;
  model?: string;
  baseURL?: string;
}

/**
 * AI generation request
 */
export interface AIGenerateRequest {
  /** User prompt for theme generation */
  prompt: string;
  /** Optional images for reference */
  images?: string[];
  /** Current theme state for context */
  currentTheme?: ThemeStyles;
  /** Target mode */
  mode?: ThemeMode;
  /** Conversation history */
  messages?: AIMessage[];
  /** AI provider to use */
  provider?: AIProviderType;
}

/**
 * AI generation response
 */
export interface AIGenerateResponse {
  /** Whether generation succeeded */
  success: boolean;
  /** Generated theme (light + dark) */
  theme?: { light: ThemeStyleProps; dark: ThemeStyleProps };
  /** Message/explanation */
  message?: string;
  /** Error message if failed */
  error?: string;
  /** Suggested follow-up prompts */
  suggestions?: string[];
}

/**
 * AI chat message
 */
export interface AIMessage {
  id: string;
  role: "user" | "assistant" | "system" | "error";
  content: string;
  images?: string[];
  timestamp: Date;
  /** If assistant, the generated theme */
  themeResult?: { light: ThemeStyleProps; dark: ThemeStyleProps };
}

/**
 * AI chat state
 */
export interface AIChatState {
  messages: AIMessage[];
  isLoading: boolean;
  error: string | null;
  currentInput: string;
  uploadedImages: string[];
}

/**
 * AI chat actions
 */
export interface AIChatActions {
  /** Add a message */
  addMessage: (message: AIMessage) => void;
  /** Update a message */
  updateMessage: (id: string, updates: Partial<AIMessage>) => void;
  /** Remove a message */
  removeMessage: (id: string) => void;
  /** Clear all messages */
  clearMessages: () => void;
  /** Set input text */
  setInput: (input: string) => void;
  /** Add an uploaded image */
  addImage: (image: string) => void;
  /** Remove an uploaded image */
  removeImage: (index: number) => void;
  /** Clear all uploaded images */
  clearImages: () => void;
  /** Set loading state */
  setLoading: (loading: boolean) => void;
  /** Set error state */
  setError: (error: string | null) => void;
  /** Get message by ID */
  getMessage: (id: string) => AIMessage | null;
  /** Reset all state */
  reset: () => void;
}

/**
 * Complete AI chat store type
 */
export type AIChatStore = AIChatState & AIChatActions;

/**
 * Suggested prompts for AI generation
 */
export const AI_SUGGESTED_PROMPTS = [
  "Create a warm, earthy theme with terracotta accents",
  "Design a cyberpunk theme with neon colors",
  "Make a minimalist monochrome theme",
  "Create a nature-inspired green palette",
  "Design a professional corporate theme",
  "Make a playful, colorful theme for kids",
  "Create a dark theme with purple accents",
  "Design a retro 80s synthwave theme",
  "Make a calm, zen-like theme",
  "Create a high-contrast accessibility-focused theme",
] as const;

/**
 * AI provider interface for implementing custom providers
 */
export interface AIProvider {
  /** Provider type identifier */
  type: AIProviderType;

  /** Generate theme from prompt */
  generate(request: AIGenerateRequest): Promise<AIGenerateResponse>;

  /** Enhance a user prompt */
  enhancePrompt?(prompt: string): Promise<string>;

  /** Check if provider is configured and available */
  isAvailable(): boolean;
}

/**
 * System prompt for AI theme generation
 */
export const AI_SYSTEM_PROMPT = `You are a theme designer for shadcn/ui components. Generate color palettes in OKLch format.

When generating themes:
1. Ensure good contrast ratios (minimum 4.5:1 for text)
2. Create cohesive color relationships
3. Consider both light and dark mode compatibility
4. Use semantic color naming (primary for main actions, destructive for dangerous actions, etc.)

Output format: Return a JSON object with 'light' and 'dark' keys, each containing the color variables.
Colors should be in oklch() format like: oklch(0.7 0.15 250)`;
