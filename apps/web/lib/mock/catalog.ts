import type { Category, CategorySlug, Product } from "./types"

export const categories: Category[] = [
  {
    slug: "beans",
    name: "Beans",
    blurb:
      "Roasted on Tuesdays, shipped on Wednesdays. Rested by the time it reaches you.",
    image: {
      kind: "illustration",
      seed: "beans",
      alt: "A scoop of coffee beans",
    },
  },
  {
    slug: "gear",
    name: "Gear",
    blurb:
      "The few tools we actually use behind the bar, and nothing we don't.",
    image: { kind: "illustration", seed: "grinder", alt: "A hand grinder" },
  },
  {
    slug: "subscriptions",
    name: "Subscriptions",
    blurb: "A bag every two or four weeks, adjusted to how you brew.",
    image: {
      kind: "illustration",
      seed: "moon",
      alt: "A crescent moon over a cup",
    },
  },
]

export const products: Product[] = [
  {
    slug: "night-owl-blend",
    name: "Night Owl Blend",
    category: "beans",
    price: 1800,
    rating: 4.8,
    reviewCount: 212,
    badges: ["bestseller"],
    options: [
      { name: "Grind", values: ["Whole bean", "Espresso", "Filter"] },
      { name: "Size", values: ["250g", "1kg"] },
    ],
    image: {
      kind: "illustration",
      seed: "beans",
      alt: "Night Owl Blend beans",
    },
    description:
      "Dark chocolate, molasses, a whisper of cherry. Built for late espresso and long conversations.",
    details: [
      "Brazil and Ethiopia",
      "Medium-dark roast",
      "Best 7 to 30 days off roast",
    ],
  },
  {
    slug: "ethiopia-guji",
    name: "Ethiopia Guji",
    category: "beans",
    price: 2100,
    rating: 4.9,
    reviewCount: 87,
    badges: ["new"],
    options: [
      { name: "Grind", values: ["Whole bean", "Filter"] },
      { name: "Size", values: ["250g", "1kg"] },
    ],
    image: {
      kind: "illustration",
      seed: "dripper",
      alt: "A pour-over dripper",
    },
    description:
      "Peach, bergamot and black tea. A washed lot that tastes like the first warm evening of spring.",
    details: ["Guji zone, Oromia", "Light roast", "Washed, 1,950 to 2,200 m"],
  },
  {
    slug: "decaf-dusk",
    name: "Decaf Dusk",
    category: "beans",
    price: 1600,
    compareAt: 1900,
    rating: 4.6,
    reviewCount: 64,
    badges: ["sale"],
    options: [
      { name: "Grind", values: ["Whole bean", "Espresso", "Filter"] },
      { name: "Size", values: ["250g"] },
    ],
    image: { kind: "illustration", seed: "moon", alt: "A crescent moon" },
    description:
      "Sugarcane-process decaf from Colombia. Caramel and red apple, and you will still sleep.",
    details: ["Huila, Colombia", "Medium roast", "Sugarcane (EA) decaf"],
  },
  {
    slug: "kenya-kiambu",
    name: "Kenya Kiambu",
    category: "beans",
    price: 2300,
    rating: 4.7,
    reviewCount: 41,
    badges: [],
    options: [
      { name: "Grind", values: ["Whole bean", "Filter"] },
      { name: "Size", values: ["250g", "1kg"] },
    ],
    image: { kind: "illustration", seed: "beans", alt: "Kenya Kiambu beans" },
    description:
      "Blackcurrant, grapefruit, a long sweet finish. Loud in the best way.",
    details: ["Kiambu county", "Light roast", "SL28 and SL34"],
  },
  {
    slug: "hand-grinder",
    name: "Hand grinder",
    category: "gear",
    price: 8900,
    rating: 4.8,
    reviewCount: 133,
    badges: ["bestseller"],
    options: [{ name: "Finish", values: ["Graphite", "Walnut"] }],
    image: { kind: "illustration", seed: "grinder", alt: "A hand grinder" },
    description:
      "Steel conical burrs and 40 clicked settings. Espresso to French press without a fight.",
    details: ["38 mm conical burrs", "Holds 30 g", "Two-year warranty"],
  },
  {
    slug: "gooseneck-kettle",
    name: "Gooseneck kettle",
    category: "gear",
    price: 6400,
    rating: 4.5,
    reviewCount: 58,
    badges: [],
    options: [{ name: "Finish", values: ["Matte black", "Steel"] }],
    image: { kind: "illustration", seed: "kettle", alt: "A gooseneck kettle" },
    description:
      "A slow, steady pour for pour-over. Holds a temperature to the degree.",
    details: [
      "0.9 L",
      "Variable temperature, 40 to 100 °C",
      "Keeps warm for 60 min",
    ],
  },
  {
    slug: "ceramic-dripper",
    name: "Ceramic dripper",
    category: "gear",
    price: 3200,
    rating: 4.7,
    reviewCount: 76,
    badges: ["new"],
    options: [{ name: "Glaze", values: ["Dusk", "Oat"] }],
    image: { kind: "illustration", seed: "dripper", alt: "A ceramic dripper" },
    description:
      "A cone with spiral ribs for an even draw-down. Glazed by hand, so no two are quite alike.",
    details: [
      "Size 02, one to four cups",
      "Fits most cone filters",
      "Dishwasher safe",
    ],
  },
  {
    slug: "night-shift-subscription",
    name: "Night Shift subscription",
    category: "subscriptions",
    price: 3200,
    rating: 4.9,
    reviewCount: 305,
    badges: ["bestseller"],
    options: [
      { name: "Every", values: ["2 weeks", "4 weeks"] },
      { name: "Bags", values: ["1", "2"] },
    ],
    image: {
      kind: "illustration",
      seed: "nightjar",
      alt: "A nightjar on a branch",
    },
    description:
      "Two rotating coffees, chosen by our roasters, with brew notes for each. Pause or skip any time.",
    details: [
      "Free shipping",
      "Skip or pause in the app",
      "Roaster's notes in every box",
    ],
  },
]

export function getProduct(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug)
}

export function getCategory(slug: string): Category | undefined {
  return categories.find((category) => category.slug === slug)
}

export function getProductsInCategory(slug: CategorySlug): Product[] {
  return products.filter((product) => product.category === slug)
}
