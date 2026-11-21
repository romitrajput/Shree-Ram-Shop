# Changelog

## 1.1.0 – 20 Nov 2026 (feature audit)

Approved by the owner from the feature-audit decision cards.

**Navigation**
- Search icon in the phone top bar; it opens the menu with the search box focused.
- Admin on phones: bottom bar (Orders · Products · Analytics · More). The admin start page opens with a "Needs attention" list (payments to verify, COD orders to pack, unfinished checkouts, reviews, enquiries).
- "Cancel order" moved under "More actions" with a confirmation tick, away from "Payment received – confirm order".

**Screens**
- Corporate page: bulk rates are an order sheet. Pick packs for several products (each starts at its MOQ) and add them all to the cart at bulk prices.
- Product page: the review form opens from a "Write a review" button.
- Home page on phones: add to cart straight from "Today's rates"; 4 bestsellers instead of 8, with "See all products".
- Admin products on phones: stock and discount editable in place and saved automatically.

**New features**
- Coupon codes: offer-code box in the cart, discount re-checked when the order is placed, usage counted. Admin → Coupons.
- PIN-code delivery check on product pages; checkout fills the state from the PIN (city still typed by the customer). Delivery days set in Admin → Shop settings.
- Unfinished checkouts: the mobile number is saved once typed at checkout; Admin → Unfinished checkouts lists them with a one-tap WhatsApp message.
- Cash on delivery (off by default): turn on in Admin → Shop settings with an order limit and fee. Bulk orders stay prepaid. COD orders skip the UPI step and go straight to packing.

**Database**
- Migration `20261120000000_feature_audit`: `Order.discount`, `couponCode`, `codFee`, `paymentMethod`; new `Coupon` and `CheckoutLead` tables. Additive only; existing data is untouched.

## 1.0.0 – 15 Nov 2026
- First release: shop, corporate bulk ordering, UPI QR payments, owner admin, analytics, test/production pipeline.
