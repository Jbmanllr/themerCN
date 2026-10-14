// The Brew Assistant: saved threads and the scripted replies that stand in
// for a model. No model is called; replies are matched by regex.
import type { ChatThread, ScriptedReply } from "./types"

export const chatThreads: ChatThread[] = [
  {
    id: "espresso-too-sour",
    title: "Espresso too sour",
    updatedAt: "2026-10-13",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "p",
            text: "My espresso tastes sour. 18 g in, 30 g out, 22 s.",
          },
        ],
      },
      {
        role: "assistant",
        content: [
          {
            type: "p",
            text: "Sour usually means under-extracted. Grind a little finer and aim for 36 g out in 28 to 30 seconds.",
          },
          {
            type: "list",
            items: [
              "Keep the dose at 18 g",
              "Two clicks finer",
              "Taste, then adjust again",
            ],
          },
          { type: "product", productSlug: "night-owl-blend" },
        ],
      },
    ],
  },
  {
    id: "v60-ratios",
    title: "V60 ratios",
    updatedAt: "2026-10-09",
    messages: [
      {
        role: "user",
        content: [{ type: "p", text: "What ratio should I use for a V60?" }],
      },
      {
        role: "assistant",
        content: [
          {
            type: "p",
            text: "Start at 1:16, so 15 g of coffee to 240 g of water, and adjust to taste.",
          },
          {
            type: "code",
            lang: "text",
            code: "15 g coffee × 16 = 240 g water",
          },
        ],
      },
    ],
  },
  {
    id: "gift-ideas",
    title: "Gift ideas",
    updatedAt: "2026-10-02",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "p",
            text: "A gift for someone who just got into pour-over?",
          },
        ],
      },
      {
        role: "assistant",
        content: [
          {
            type: "p",
            text: "A ceramic dripper and a bag of something bright makes a lovely start.",
          },
          { type: "product", productSlug: "ceramic-dripper" },
        ],
      },
    ],
  },
]

export const scriptedReplies: ScriptedReply[] = [
  {
    match: /sour|bitter|espresso|shot/i,
    delayMs: 400,
    reply: [
      {
        type: "p",
        text: "Taste is the best gauge. Sour means grind finer; bitter means grind coarser.",
      },
      {
        type: "list",
        ordered: true,
        items: ["Fix the dose", "Change only the grind", "Pull, taste, repeat"],
      },
      { type: "product", productSlug: "night-owl-blend" },
    ],
  },
  {
    match: /ratio|v60|pour[- ]?over|filter/i,
    delayMs: 350,
    reply: [
      {
        type: "p",
        text: "For filter, 1:16 is a friendly start: 15 g of coffee to 240 g of water at about 94 °C.",
      },
      {
        type: "code",
        lang: "text",
        code: "bloom 45 g · 45 s, then pour to 240 g by 2:30",
      },
    ],
  },
  {
    match: /decaf|caffeine|sleep/i,
    delayMs: 350,
    reply: [
      {
        type: "p",
        text: "Our sugarcane decaf keeps the caramel sweetness. Brew it exactly like the rest.",
      },
      { type: "product", productSlug: "decaf-dusk" },
    ],
  },
  {
    match: /gift|present|birthday/i,
    delayMs: 350,
    reply: [
      {
        type: "p",
        text: "A Night Shift subscription is the gift that keeps arriving.",
      },
      { type: "product", productSlug: "night-shift-subscription" },
    ],
  },
  {
    match: "fallback",
    delayMs: 300,
    reply: [
      {
        type: "p",
        text: "I can help with brew ratios, dialling in espresso, decaf and gift ideas. What are you brewing today?",
      },
    ],
  },
]

export function getChatThread(id: string): ChatThread | undefined {
  return chatThreads.find((thread) => thread.id === id)
}
