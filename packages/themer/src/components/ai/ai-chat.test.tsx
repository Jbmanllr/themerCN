// @vitest-environment happy-dom

// The AI chat. Retry and Edit regenerate from a prompt that is already in the
// chat and must not add it again as a new user message; neither is offered
// while a generation runs. Applying a generated theme goes through the
// editor's import transition (history entry, new HSL checkpoint, adjustments
// reset), so the next HSL slider move starts from the applied theme instead of
// from the one before it.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const generate = vi.hoisted(() => vi.fn());
vi.mock("../../api/ai-generate", () => ({ generateTheme: generate }));

import { defaultThemeState } from "../../config/defaults";
import { useAIStore } from "../../stores/ai-store";
import { useEditorStore } from "../../stores/editor-store";
import type { AIMessage, ThemeStyleProps } from "../../types";
import { AIChat } from "./ai-chat";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement;

const generated = {
  light: { ...defaultThemeState.styles.light, primary: "#123456" },
  dark: { ...defaultThemeState.styles.dark, primary: "#654321" },
} satisfies { light: ThemeStyleProps; dark: ThemeStyleProps };

const message = (
  id: string,
  role: AIMessage["role"],
  content: string,
  extra: Partial<AIMessage> = {},
): AIMessage => ({
  id,
  role,
  content,
  timestamp: new Date("2026-10-04T10:00:00Z"),
  ...extra,
});

async function mount(messages: AIMessage[]) {
  useAIStore.setState({
    messages,
    isLoading: false,
    error: null,
    currentInput: "",
    uploadedImages: [],
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<AIChat />));
}

const button = (name: string) =>
  [...container.querySelectorAll("button")].find((candidate) =>
    candidate.textContent?.includes(name),
  );

beforeEach(() => {
  generate.mockReset().mockResolvedValue({
    success: true,
    theme: generated,
    message: "Here you go",
  });
  useEditorStore.setState({
    themeState: defaultThemeState,
    themeCheckpoint: null,
    history: [],
    future: [],
  });
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container.remove();
});

const roles = () => useAIStore.getState().messages.map((m) => m.role);

describe("AIChat retry and edit", () => {
  it("retries from the earlier prompt without adding it to the chat again", async () => {
    await mount([
      message("u1", "user", "a calm blue theme", {
        images: ["data:image/png;base64,AA"],
      }),
      message("a1", "error", "Failed to generate theme"),
    ]);

    await act(async () => button("Retry")?.click());

    expect(generate).toHaveBeenCalledOnce();
    expect(generate.mock.calls[0]?.[0]).toMatchObject({
      prompt: "a calm blue theme",
      images: ["data:image/png;base64,AA"],
    });
    // One new answer, and the prompt is not in the chat twice.
    expect(roles()).toEqual(["user", "error", "assistant"]);
    expect(
      useAIStore
        .getState()
        .messages.filter((m) => m.content === "a calm blue theme"),
    ).toHaveLength(1);
  });

  it("regenerates from an edited prompt and keeps one copy of it", async () => {
    await mount([
      message("u1", "user", "a calm blue theme"),
      message("a1", "assistant", "Here you go", { themeResult: generated }),
    ]);

    await act(async () => button("Edit")?.click());
    const textarea = container.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="Edit message"]',
    );
    expect(textarea).not.toBeNull();
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )?.set?.call(textarea, "a warm orange theme");
      textarea?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => button("Save")?.click());

    expect(generate).toHaveBeenCalledOnce();
    expect(generate.mock.calls[0]?.[0]).toMatchObject({
      prompt: "a warm orange theme",
    });
    const { messages } = useAIStore.getState();
    expect(messages.filter((m) => m.role === "user")).toHaveLength(1);
    expect(messages.find((m) => m.id === "u1")?.content).toBe(
      "a warm orange theme",
    );
    expect(roles()).toEqual(["user", "assistant", "assistant"]);
  });

  it("offers neither Retry nor Edit while a generation runs", async () => {
    await mount([
      message("u1", "user", "a calm blue theme"),
      message("a1", "assistant", "Here you go", { themeResult: generated }),
    ]);
    expect(button("Retry")).toBeDefined();
    expect(button("Edit")).toBeDefined();

    await act(async () => useAIStore.setState({ isLoading: true }));

    expect(button("Retry")).toBeUndefined();
    expect(button("Edit")).toBeUndefined();
  });
});

describe("AIChat apply theme", () => {
  it("applies through the import transition, so later HSL moves start from it", async () => {
    // The person had moved the HSL sliders: a stale checkpoint is what the next
    // slider move would rebuild the theme from.
    const stale = {
      ...defaultThemeState,
      hslAdjustments: { hueShift: 40, saturationScale: 1.2, lightnessScale: 1 },
    };
    useEditorStore.setState({
      themeState: stale,
      themeCheckpoint: defaultThemeState,
    });
    await mount([
      message("u1", "user", "a calm blue theme"),
      message("a1", "assistant", "Here you go", { themeResult: generated }),
    ]);

    await act(async () => button("Apply Theme")?.click());

    const state = useEditorStore.getState();
    expect(state.themeState.styles.light.primary).toBe("#123456");
    expect(state.themeState.styles.dark.primary).toBe("#654321");
    expect(state.themeState.hslAdjustments).toEqual({
      hueShift: 0,
      saturationScale: 1,
      lightnessScale: 1,
    });
    // The checkpoint is the applied theme, and the old one can be undone to.
    expect(state.themeCheckpoint).toBe(state.themeState);
    expect(state.history).toHaveLength(1);
    expect(state.history[0]?.state).toBe(stale);
  });
});
