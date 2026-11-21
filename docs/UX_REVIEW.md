# UX review – November 2026

Reviewed by rendering every shop and admin page at phone (390 px) and desktop (1280 px) widths, walking the buying path with keyboard and touch, and running the Playwright suite in `e2e/` (29 tests, phone + desktop).

## Fixed in this pass

| Area | Problem found | Change |
|---|---|---|
| Prices | Discounts produced paise prices (₹494.10, ₹1,079.10) and mixed formats on one page (₹988.20 vs ₹988) | Selling price is rounded to whole rupees when the discount is applied (`priceAfterDiscount`, seed) |
| UPI payment on phones | The QR code was the main way to pay, but a customer on a phone can't scan their own screen | Phones get a big "Pay ₹X with a UPI app" button first; the QR is labelled for paying from another device; UPI ID has a Copy button |
| After paying | Page still showed the whole QR + form after the UTR was sent, inviting double payment | Clear "we received your transaction ID" state; re-submitting is tucked behind "Entered the wrong ID?" |
| WhatsApp button | Floating pill covered form fields and text on phones | Icon-only circle on phones, hidden on checkout and payment pages |
| Product page (phone) | Add to cart scrolls out of sight; shoppers had to scroll back up | Sticky "Add to cart" bar appears once the main button is off-screen (found a bug in the first version during testing: fast flings skipped it; fixed with a scroll listener) |
| Product cards | No way to buy without opening each product | "Add to cart" on every card, with "N in cart" feedback; "Only N left" when stock ≤ 10 |
| Search | Only reachable from the Shop page | Search box in the header (desktop) and in the menu (phone); result count on the results page; sort applies instantly |
| Cart | Delivery fee was a surprise at checkout; quantity was a tiny number box | Free-delivery progress ("Add ₹505 more for free delivery"), subtotal/delivery/total, +/− steppers that respect MOQ for bulk lines |
| Checkout | GST section shown to every retail buyer; total hidden at the bottom on phones; errors left focus at the button | GST details collapsed for retail ("Need a GST invoice?"); total summary at the top on phones; first invalid field is focused, fields marked `aria-invalid` with linked messages |
| Buy box | Bulk/retail toggle used tab roles with no panel; − button allowed taps below the minimum | Pressed-state toggle buttons (44 px); − / + disabled at MOQ and stock limits |
| Admin on a phone | Orders table hid amount and status off-screen | Phone layout lists each order with amount and status |
| Admin insights | Coloured side bars carried meaning by colour alone | Each suggestion has a word label: Needs attention / Going well / Idea |
| Browser surfaces | Default blue selection, checkboxes and file inputs | Selection, caret, checkbox/radio and file-picker styled in the shop palette |

## Recommended next features (by expected impact)

1. **Abandoned-checkout follow-up on WhatsApp.** The dashboard already counts carts that never become orders. Save the phone number as soon as it is typed at checkout, and give the owner a "Follow up" list with a one-tap WhatsApp message. This is usually the cheapest recovered revenue.
2. **Order updates on WhatsApp (automatic).** Send "order received", "payment confirmed" and "shipped + tracking" messages through the WhatsApp Business API (Gupshup, Interakt or Meta Cloud API). Today the owner has to tap a button for each.
3. **Automatic UPI payment confirmation.** Move from "customer types UTR, owner checks bank app" to a payment gateway UPI collect (Razorpay / Cashfree, ~0–2% fee) so orders confirm themselves. The order statuses already fit.
4. **PIN-code check on the product page.** "Delivers to 411001 in 2–3 days" before checkout, and auto-fill city/state at checkout from the PIN.
5. **Gift-box builder for corporate buyers.** Pick a box size, choose the mix, upload a logo, see the per-box price at their quantity, then "Request quote" with all of it filled in. Diwali gifting is the biggest corporate occasion.
6. **Tiered bulk prices.** e.g. 50+ packs ₹449, 200+ packs ₹429. Today each product has one MOQ and one bulk price.
7. **Reorder in one tap.** "Order again" on the order page and in a WhatsApp reminder ~30 days later; dry fruits are a repeat purchase and the dashboard shows only 18% of customers reorder.
8. **Customer photos in reviews**, and a review request message 5 days after delivery.
9. **Hindi language toggle.** The fonts already support Devanagari; start with product names, buttons and checkout.
10. **Coupon codes** for campaigns (e.g. `DIWALI10`), so the owner can see which promotion drove which orders in analytics.
11. **Back-in-stock alerts** ("WhatsApp me when it's back") on out-of-stock products, which also tells the owner what to restock first.
12. **Installable app (PWA)** so repeat customers can add the shop to their home screen.

## Still to check on real devices

- Font rendering with the real Bricolage Grotesque / Hind (the review harness used fallback fonts).
- The UPI button on iPhone: iOS opens a chooser only if a UPI app is installed; keep the QR and UPI ID visible as fallbacks (they are).
- Slow 3G: product photos should be compressed to WebP under ~150 KB before upload.
