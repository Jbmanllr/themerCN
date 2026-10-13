"use server";

import type {
  AIGenerateRequest,
  AIGenerateResponse,
  ThemeStyleProps,
} from "../types";
import { defaultLightStyles, defaultDarkStyles } from "../config/defaults";

/**
 * Server action meant to generate a theme with AI. It is a mock: it calls no
 * provider and answers a theme derived from the prompt's words
 * (generateMockTheme). Nothing wires a provider to it: ThemerProvider never
 * reads `ThemerConfig.aiProvider`. Its one caller is the Generate panel's
 * AIChat (components/ai/ai-chat.tsx), whose "Apply Theme" applies the
 * returned styles.
 */
export async function generateTheme(
  request: AIGenerateRequest,
): Promise<AIGenerateResponse> {
  const { prompt, currentTheme } = request;

  try {
    // This is a placeholder implementation
    // In production, you would call the actual AI API here
    // Example with OpenAI:
    //
    // const response = await openai.chat.completions.create({
    //   model: 'gpt-4o',
    //   messages: [
    //     { role: 'system', content: AI_SYSTEM_PROMPT },
    //     { role: 'user', content: prompt, ...(images.length && { images }) },
    //   ],
    //   response_format: { type: 'json_object' },
    // });

    // For now, return a mock response based on the prompt
    const mockTheme = generateMockTheme(prompt, currentTheme);

    return {
      success: true,
      theme: mockTheme,
      message: `Theme generated based on: "${prompt}"`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: `Failed to generate theme: ${message}`,
    };
  }
}

/**
 * Enhance a prompt with additional context for better AI results
 */
export async function enhancePrompt(prompt: string): Promise<string> {
  // This would call an AI to expand/improve the prompt
  // For now, return an enhanced version with common additions
  const enhancements = [
    "with good contrast ratios",
    "following accessibility guidelines",
    "with complementary colors",
  ];

  const randomEnhancement =
    enhancements[Math.floor(Math.random() * enhancements.length)];

  return `${prompt} ${randomEnhancement}`;
}

/**
 * Generate a mock theme based on prompt keywords
 * This is for development/testing when AI is not configured
 */
function generateMockTheme(
  prompt: string,
  currentTheme?: { light: ThemeStyleProps; dark: ThemeStyleProps },
): { light: ThemeStyleProps; dark: ThemeStyleProps } {
  const promptLower = prompt.toLowerCase();
  const base = currentTheme ?? {
    light: defaultLightStyles,
    dark: defaultDarkStyles,
  };

  // Detect mood/theme from prompt
  if (
    promptLower.includes("dark") ||
    promptLower.includes("night") ||
    promptLower.includes("moody")
  ) {
    return {
      light: {
        ...base.light,
        background: "oklch(0.30 0.01 240)",
        foreground: "oklch(0.95 0.01 240)",
        card: "oklch(0.25 0.015 240)",
        "card-foreground": "oklch(0.95 0.01 240)",
        primary: "oklch(0.65 0.15 250)",
        "primary-foreground": "oklch(0.98 0.01 240)",
        secondary: "oklch(0.35 0.02 240)",
        "secondary-foreground": "oklch(0.90 0.01 240)",
        muted: "oklch(0.35 0.01 240)",
        "muted-foreground": "oklch(0.70 0.02 240)",
        accent: "oklch(0.55 0.12 280)",
        "accent-foreground": "oklch(0.98 0.01 240)",
      },
      dark: {
        ...base.dark,
        background: "oklch(0.15 0.01 250)",
        foreground: "oklch(0.95 0.01 250)",
        card: "oklch(0.20 0.015 250)",
        "card-foreground": "oklch(0.95 0.01 250)",
        primary: "oklch(0.70 0.15 260)",
        "primary-foreground": "oklch(0.15 0.01 260)",
        secondary: "oklch(0.25 0.02 250)",
        "secondary-foreground": "oklch(0.90 0.01 250)",
        muted: "oklch(0.25 0.01 250)",
        "muted-foreground": "oklch(0.65 0.02 250)",
        accent: "oklch(0.60 0.12 290)",
        "accent-foreground": "oklch(0.15 0.01 250)",
      },
    };
  }

  if (
    promptLower.includes("warm") ||
    promptLower.includes("cozy") ||
    promptLower.includes("sunset")
  ) {
    return {
      light: {
        ...base.light,
        background: "oklch(0.98 0.01 45)",
        foreground: "oklch(0.20 0.02 30)",
        card: "oklch(0.97 0.015 40)",
        "card-foreground": "oklch(0.20 0.02 30)",
        primary: "oklch(0.60 0.18 30)",
        "primary-foreground": "oklch(0.98 0.01 45)",
        secondary: "oklch(0.92 0.04 50)",
        "secondary-foreground": "oklch(0.25 0.02 30)",
        muted: "oklch(0.94 0.02 45)",
        "muted-foreground": "oklch(0.45 0.04 30)",
        accent: "oklch(0.70 0.15 50)",
        "accent-foreground": "oklch(0.20 0.02 30)",
      },
      dark: {
        ...base.dark,
        background: "oklch(0.18 0.02 30)",
        foreground: "oklch(0.95 0.02 45)",
        card: "oklch(0.22 0.025 35)",
        "card-foreground": "oklch(0.95 0.02 45)",
        primary: "oklch(0.65 0.18 35)",
        "primary-foreground": "oklch(0.15 0.02 30)",
        secondary: "oklch(0.28 0.03 40)",
        "secondary-foreground": "oklch(0.90 0.02 45)",
        muted: "oklch(0.25 0.02 35)",
        "muted-foreground": "oklch(0.65 0.03 45)",
        accent: "oklch(0.55 0.15 45)",
        "accent-foreground": "oklch(0.95 0.02 45)",
      },
    };
  }

  if (
    promptLower.includes("nature") ||
    promptLower.includes("green") ||
    promptLower.includes("forest")
  ) {
    return {
      light: {
        ...base.light,
        background: "oklch(0.98 0.01 140)",
        foreground: "oklch(0.20 0.03 145)",
        card: "oklch(0.97 0.015 138)",
        "card-foreground": "oklch(0.20 0.03 145)",
        primary: "oklch(0.50 0.15 145)",
        "primary-foreground": "oklch(0.98 0.01 140)",
        secondary: "oklch(0.90 0.05 142)",
        "secondary-foreground": "oklch(0.25 0.03 145)",
        muted: "oklch(0.93 0.03 140)",
        "muted-foreground": "oklch(0.45 0.05 145)",
        accent: "oklch(0.65 0.12 160)",
        "accent-foreground": "oklch(0.20 0.03 145)",
      },
      dark: {
        ...base.dark,
        background: "oklch(0.15 0.02 145)",
        foreground: "oklch(0.95 0.02 140)",
        card: "oklch(0.20 0.025 148)",
        "card-foreground": "oklch(0.95 0.02 140)",
        primary: "oklch(0.55 0.15 150)",
        "primary-foreground": "oklch(0.12 0.02 145)",
        secondary: "oklch(0.25 0.04 145)",
        "secondary-foreground": "oklch(0.90 0.02 140)",
        muted: "oklch(0.22 0.025 145)",
        "muted-foreground": "oklch(0.65 0.04 140)",
        accent: "oklch(0.60 0.12 155)",
        "accent-foreground": "oklch(0.95 0.02 140)",
      },
    };
  }

  if (
    promptLower.includes("ocean") ||
    promptLower.includes("blue") ||
    promptLower.includes("sea")
  ) {
    return {
      light: {
        ...base.light,
        background: "oklch(0.98 0.01 220)",
        foreground: "oklch(0.18 0.03 230)",
        card: "oklch(0.97 0.015 218)",
        "card-foreground": "oklch(0.18 0.03 230)",
        primary: "oklch(0.55 0.18 235)",
        "primary-foreground": "oklch(0.98 0.01 220)",
        secondary: "oklch(0.90 0.05 225)",
        "secondary-foreground": "oklch(0.20 0.03 230)",
        muted: "oklch(0.93 0.03 220)",
        "muted-foreground": "oklch(0.45 0.05 230)",
        accent: "oklch(0.65 0.14 200)",
        "accent-foreground": "oklch(0.18 0.03 230)",
      },
      dark: {
        ...base.dark,
        background: "oklch(0.14 0.02 235)",
        foreground: "oklch(0.95 0.02 220)",
        card: "oklch(0.18 0.025 238)",
        "card-foreground": "oklch(0.95 0.02 220)",
        primary: "oklch(0.60 0.18 240)",
        "primary-foreground": "oklch(0.12 0.02 235)",
        secondary: "oklch(0.22 0.04 235)",
        "secondary-foreground": "oklch(0.90 0.02 220)",
        muted: "oklch(0.20 0.025 235)",
        "muted-foreground": "oklch(0.65 0.04 220)",
        accent: "oklch(0.55 0.14 195)",
        "accent-foreground": "oklch(0.95 0.02 220)",
      },
    };
  }

  if (
    promptLower.includes("purple") ||
    promptLower.includes("violet") ||
    promptLower.includes("royal")
  ) {
    return {
      light: {
        ...base.light,
        background: "oklch(0.98 0.01 290)",
        foreground: "oklch(0.18 0.04 280)",
        card: "oklch(0.97 0.015 288)",
        "card-foreground": "oklch(0.18 0.04 280)",
        primary: "oklch(0.55 0.20 290)",
        "primary-foreground": "oklch(0.98 0.01 290)",
        secondary: "oklch(0.90 0.06 295)",
        "secondary-foreground": "oklch(0.20 0.04 280)",
        muted: "oklch(0.93 0.03 290)",
        "muted-foreground": "oklch(0.45 0.06 280)",
        accent: "oklch(0.65 0.16 310)",
        "accent-foreground": "oklch(0.18 0.04 280)",
      },
      dark: {
        ...base.dark,
        background: "oklch(0.14 0.03 285)",
        foreground: "oklch(0.95 0.02 290)",
        card: "oklch(0.18 0.035 288)",
        "card-foreground": "oklch(0.95 0.02 290)",
        primary: "oklch(0.60 0.20 295)",
        "primary-foreground": "oklch(0.12 0.03 285)",
        secondary: "oklch(0.22 0.05 290)",
        "secondary-foreground": "oklch(0.90 0.02 290)",
        muted: "oklch(0.20 0.035 285)",
        "muted-foreground": "oklch(0.65 0.05 290)",
        accent: "oklch(0.55 0.16 305)",
        "accent-foreground": "oklch(0.95 0.02 290)",
      },
    };
  }

  // Default: return a slightly modified version of current theme
  return {
    light: {
      ...base.light,
      primary: adjustHue(base.light.primary, 30),
      accent: adjustHue(base.light.accent, -20),
    },
    dark: {
      ...base.dark,
      primary: adjustHue(base.dark.primary, 30),
      accent: adjustHue(base.dark.accent, -20),
    },
  };
}

/**
 * Simple hue adjustment for oklch colors
 */
function adjustHue(color: string, delta: number): string {
  const match = color.match(/oklch\(([^)]+)\)/);
  if (!match) return color;

  const parts = match[1]!.split(/\s+/);
  if (parts.length < 3) return color;

  const hue = parseFloat(parts[2]!) || 0;
  const newHue = (hue + delta + 360) % 360;
  parts[2] = newHue.toFixed(0);

  return `oklch(${parts.join(" ")})`;
}
