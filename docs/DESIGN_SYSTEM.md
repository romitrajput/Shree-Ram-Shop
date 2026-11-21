# Design system

## Direction

The reference (a Dribbble dry-fruits concept) is warm and product-led. This design keeps that warmth but anchors it in how a dry-fruit trader actually sells: the **rate board**. The home page opens with "Today's rates", a live price list straight from the database, the way a mandi shop chalks up the day's prices. That one element is the signature; everything around it stays quiet.

Customers are mostly on phones and compare prices, so price and discount are always the most legible thing on a product.

## Colour

| Token | Hex | Use |
|---|---|---|
| `pista` | `#2F4A2A` | Brand: pistachio-shell green. Header text, primary buttons, rate board, charts |
| `pista-dark` | `#1F3320` | Footer, button hover |
| `pista-light` | `#E7EDDC` | Success messages, image placeholders |
| `marigold` | `#F2A900` | Rates on the board, ratings, focus ring, secondary CTA |
| `khata` | `#A3201B` | Ledger red: discounts, errors, test-environment banner. Used sparingly |
| `ink` / `ink-soft` / `ink-mute` | `#1E1A16` / `#5B544C` / `#6F675E` | Text hierarchy |
| `paper` / `paper-line` | `#FBFAF6` / `#E6E1D6` | Page background, borders |

Contrast (WCAG): `ink` on `paper` 16.6:1, white on `pista` 9.8:1, `ink` on `marigold` 8.6:1, `ink-mute` on `paper` 5.3:1, marigold rates on the `pista` board 4.9:1.

## Type

- **Bricolage Grotesque** (display): headings and prices. Its slightly irregular, inky shapes give a hand-lettered market feel without being decorative.
- **Hind** (body): designed for Indian scripts, so श्री राम in the logo and any future Hindi text sit naturally next to English.
- Prices use tabular numbers (`.rate-num`) so columns of rates line up.
- Sentence case everywhere; no all-caps labels.

## Components

- Buttons: pill-shaped. Primary = pista, accent = marigold, ghost = white with border, danger = red outline.
- Cards (`.card`): white, 14 px radius, 1 px `paper-line` border, no shadow. Only the rate board has a shadow.
- Forms: labels above inputs, hint text below, errors in `khata` under the field. Failed submissions keep what was typed.
- Product card: 4:5 photo, pack size and origin, name, rating, price with struck-through MRP and "% off".

## Motion

Only in response to the user: product photo zooms slightly on hover, buttons change colour. Nothing animates on load. `prefers-reduced-motion` turns transitions off.

## Accessibility

Visible focus ring (marigold, 3 px), labels on all inputs, alt text on product photos (editable per photo), star ratings announced as text, charts have hover/keyboard detail and a table view, colour is never the only signal (status badges have words).
