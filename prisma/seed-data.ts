/** Starter catalogue, shared by the seed script and the end-to-end tests. */
export const CATEGORIES = [
  { name: "Nuts", slug: "nuts", sortOrder: 1 },
  { name: "Dried fruits", slug: "dried-fruits", sortOrder: 2 },
  { name: "Seeds & mixes", slug: "seeds-mixes", sortOrder: 3 },
  { name: "Gift boxes", slug: "gift-boxes", sortOrder: 4 }
];

export const PRODUCTS = [
  { name: "California Almonds (Badam)", cat: "nuts", unit: "500 g", origin: "California", mrp: 549, off: 10, stock: 240, featured: true, moq: 50, corp: 449, tags: ["badam", "almond"], short: "Crunchy, sweet NP grade almonds. Sorted to remove broken pieces." },
  { name: "Mamra Almonds", cat: "nuts", unit: "250 g", origin: "Iran", mrp: 899, off: 5, stock: 60, featured: true, moq: 25, corp: 799, tags: ["badam", "mamra"], short: "Oil-rich, concave Mamra almonds. Best soaked overnight." },
  { name: "Cashews W320 (Kaju)", cat: "nuts", unit: "500 g", origin: "Goa", mrp: 649, off: 8, stock: 300, featured: true, moq: 50, corp: 545, tags: ["kaju", "cashew"], short: "Whole W320 cashews, creamy and evenly sized." },
  { name: "Roasted Salted Pistachios", cat: "nuts", unit: "250 g", origin: "Iran", mrp: 499, off: 0, stock: 150, featured: true, moq: 40, corp: 429, tags: ["pista", "pistachio"], short: "Slow-roasted in shell with a light pinch of salt." },
  { name: "Walnut Kernels (Akhrot)", cat: "nuts", unit: "250 g", origin: "Kashmir", mrp: 449, off: 12, stock: 90, featured: false, moq: 40, corp: 369, tags: ["akhrot", "walnut"], short: "Light-coloured halves from Kashmir orchards." },
  { name: "Golden Raisins (Kishmish)", cat: "dried-fruits", unit: "500 g", origin: "Nashik", mrp: 299, off: 15, stock: 400, featured: true, moq: 100, corp: 219, tags: ["kishmish", "raisin"], short: "Plump, seedless golden raisins." },
  { name: "Afghan Figs (Anjeer)", cat: "dried-fruits", unit: "250 g", origin: "Afghanistan", mrp: 599, off: 10, stock: 70, featured: false, moq: 30, corp: 489, tags: ["anjeer", "fig"], short: "Soft, naturally sweet dried figs." },
  { name: "Medjool Dates (Khajoor)", cat: "dried-fruits", unit: "500 g", origin: "Jordan", mrp: 899, off: 10, stock: 110, featured: true, moq: 40, corp: 739, tags: ["khajoor", "dates"], short: "Large, caramel-soft Medjool dates." },
  { name: "Trail Mix", cat: "seeds-mixes", unit: "400 g", origin: null, mrp: 399, off: 0, stock: 180, featured: false, moq: 50, corp: 329, tags: ["mix", "snack"], short: "Almonds, cashews, raisins, cranberries and seeds." },
  { name: "Diwali Dry Fruit Gift Box", cat: "gift-boxes", unit: "4 × 125 g", origin: null, mrp: 1199, off: 10, stock: 200, featured: true, moq: 25, corp: 899, tags: ["gift", "diwali", "festival"], short: "Almonds, cashews, pistachios and raisins in a reusable box." }
];
