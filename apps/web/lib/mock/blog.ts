import type {
  Author,
  AuthorId,
  Post,
  PostCategory,
  PostCategorySlug,
} from "./types"

export const authors: Author[] = [
  {
    id: "mara",
    name: "Mara Okafor",
    role: "Head roaster",
    avatar: { kind: "illustration", seed: "beans", alt: "Mara Okafor" },
  },
  {
    id: "theo",
    name: "Theo Lindqvist",
    role: "Bar lead",
    avatar: { kind: "illustration", seed: "cup", alt: "Theo Lindqvist" },
  },
  {
    id: "ines",
    name: "Inès Marchetti",
    role: "Green coffee buyer",
    avatar: { kind: "illustration", seed: "nightjar", alt: "Inès Marchetti" },
  },
]

export const postCategories: PostCategory[] = [
  {
    slug: "brewing",
    name: "Brewing",
    blurb: "Recipes, ratios and the odd rescue.",
  },
  {
    slug: "origins",
    name: "Origins",
    blurb: "Where our coffee grows, and who grows it.",
  },
  { slug: "gear", name: "Gear", blurb: "Tools worth the counter space." },
]

export const posts: Post[] = [
  {
    slug: "how-to-dial-in-espresso",
    title: "How to dial in espresso",
    excerpt:
      "Sour, bitter, or just flat? Change one thing at a time and taste.",
    category: "brewing",
    author: "theo",
    publishedAt: "2026-09-18",
    readingMinutes: 6,
    cover: { kind: "illustration", seed: "cup", alt: "A cup of espresso" },
    body: [
      {
        type: "p",
        text: "Dialling in is a conversation with your grinder. Keep the dose fixed, change the grind, and let the shot tell you what it needs.",
      },
      { type: "h2", text: "Start from a recipe" },
      {
        type: "list",
        ordered: true,
        items: ["18 g in", "36 g out", "28 to 30 seconds"],
      },
      {
        type: "p",
        text: "Sour and thin means under-extracted: grind finer. Bitter and dry means over-extracted: grind coarser.",
      },
      { type: "code", lang: "text", code: "ratio = 36 g / 18 g = 1:2" },
      {
        type: "quote",
        text: "Change one thing at a time. Otherwise you are just making coffee, not learning.",
        cite: "Theo, every morning",
      },
      { type: "product", productSlug: "night-owl-blend" },
    ],
  },
  {
    slug: "a-slower-pour-over",
    title: "A slower pour-over",
    excerpt:
      "Five pours, four minutes, and a cup that tastes like the bag says.",
    category: "brewing",
    author: "mara",
    publishedAt: "2026-08-30",
    readingMinutes: 5,
    cover: {
      kind: "illustration",
      seed: "dripper",
      alt: "A pour-over dripper",
    },
    body: [
      {
        type: "p",
        text: "Light roasts reward patience. Split the water into five pours and give each one time to drain.",
      },
      { type: "h2", text: "The recipe" },
      {
        type: "list",
        items: [
          "15 g coffee, medium-fine",
          "250 g water at 94 °C",
          "Bloom with 45 g for 45 seconds",
        ],
      },
      {
        type: "image",
        image: {
          kind: "illustration",
          seed: "kettle",
          alt: "A gooseneck kettle pouring",
        },
        caption: "Pour in slow circles, away from the paper.",
      },
      { type: "product", productSlug: "ethiopia-guji" },
    ],
  },
  {
    slug: "visiting-guji",
    title: "Three days in Guji",
    excerpt: "Washing stations, cherry sorting, and a lot of very good tea.",
    category: "origins",
    author: "ines",
    publishedAt: "2026-07-12",
    readingMinutes: 9,
    cover: { kind: "illustration", seed: "beans", alt: "Coffee cherries" },
    body: [
      {
        type: "p",
        text: "The road to the washing station climbs for an hour through enset and shade trees. By the top, everyone is talking about rain.",
      },
      { type: "h2", text: "Why washed" },
      {
        type: "p",
        text: "Washing strips the fruit before drying, which keeps the cup clean and lets the florals through.",
      },
    ],
  },
  {
    slug: "the-only-grinder-guide",
    title: "The only grinder guide you need",
    excerpt: "Burrs matter more than motors. Here is what to look for.",
    category: "gear",
    author: "theo",
    publishedAt: "2026-06-03",
    readingMinutes: 7,
    cover: { kind: "illustration", seed: "grinder", alt: "A hand grinder" },
    body: [
      {
        type: "p",
        text: "An even grind is the single biggest upgrade for most home brewers. A good hand grinder gets you there for less than a motor.",
      },
      { type: "product", productSlug: "hand-grinder" },
    ],
  },
  {
    slug: "decaf-without-apology",
    title: "Decaf, without apology",
    excerpt: "How sugarcane processing keeps the sweetness in.",
    category: "origins",
    author: "mara",
    publishedAt: "2026-05-21",
    readingMinutes: 4,
    cover: { kind: "illustration", seed: "moon", alt: "A crescent moon" },
    body: [
      {
        type: "p",
        text: "Ethyl acetate from fermented sugarcane lifts caffeine out gently. What is left still tastes like coffee.",
      },
      { type: "product", productSlug: "decaf-dusk" },
    ],
  },
]

export function getPost(slug: string): Post | undefined {
  return posts.find((post) => post.slug === slug)
}

export function getPostCategory(slug: string): PostCategory | undefined {
  return postCategories.find((category) => category.slug === slug)
}

/** The posts in a journal category, newest first (as `posts` is ordered). */
export function getPostsInCategory(slug: PostCategorySlug): Post[] {
  return posts.filter((post) => post.category === slug)
}

export function getAuthor(id: AuthorId): Author {
  const author = authors.find((a) => a.id === id)
  if (!author) throw new Error(`Unknown author: ${id}`)
  return author
}
