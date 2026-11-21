# Owner guide

Log in at **/admin** with your email and password. The admin panel works on a phone.

## First-time setup (Shop settings)

1. **UPI ID**: the UPI ID money should go to (from GPay/PhonePe/your bank app), and the name on the account. Each order then gets a QR code with the exact amount filled in.
2. Optional: upload your shop's printed QR image as a backup.
3. **Delivery fee** and the order value above which delivery is free.
4. WhatsApp number, phone, email, GSTIN and address (shown in the footer).

Do this separately on the test site and the live site; they don't share settings. On test, use your own UPI ID only if you want to try a real ₹1 payment.

## Adding or editing a product

Admin → **Products** → **Add product**.

- **Photos:** upload several; pick the *Main photo*. Square photos on a plain background look best. Write a short description for each photo.
- **MRP and Discount %:** the selling price is worked out for you and shown under the fields.
- **Packs in stock:** goes down automatically with each order and back up if you cancel one.
- **Sell to corporate customers in bulk:** tick it, then set the **MOQ** (minimum packs) and the **corporate price per pack**. The product then appears in the bulk-rate table on the Corporate page.
- **Feature on home page** puts it in "Most ordered this month" and near the top of the rate board.
- **Search keywords:** add Hindi/local names (badam, kaju, anjeer) so customers find it.

For quick daily changes (discount and stock) use the boxes directly in the products list and press **Save** on that row.

## On your phone

The admin has a bar at the bottom: **Orders · Products · Analytics · More**. The red numbers show what needs you. Analytics opens with **Needs attention**: payments to verify, COD orders to pack, unfinished checkouts, reviews and enquiries. In **Products** you can change stock with − / + and the discount; changes save by themselves.

## Handling an order

1. A customer places an order and sees your QR code with the amount.
2. After paying, they enter the **UTR** (UPI transaction ID). The order moves to **Payment to verify** and the Orders menu shows a count.
3. Open the order. Check your bank/UPI app for that amount and UTR. If it's there, press **Payment received – confirm order**.
4. Then **Mark packed → Mark shipped → Mark delivered**. Use **WhatsApp customer** to send updates.
5. Orders still **Waiting for payment** after a day are flagged on the dashboard; call or WhatsApp the customer.

To cancel, open **More actions** at the bottom of the order, tick the confirmation and press **Cancel order**. Cancelling returns the stock. Refund the customer from your UPI app if they paid.

## Coupons

Admin → **Coupons** (on a phone: **More → Coupons**). Create a code such as `DIWALI10`: percent or rupees off, an optional minimum order, maximum discount, last day and number of uses. Customers type it in the cart. Each coupon shows how often it was used and how much it sold, so use one code per campaign. Turn a code off at any time.

## Cash on delivery

Off until you turn it on in **Shop settings → Cash on delivery**. Set the largest order you'll accept on COD and the fee that covers the courier's charge. Bulk (corporate) orders are always prepaid. COD orders skip the UPI step and appear as "Confirmed" with a **COD** label; collect the money on delivery and mark the order delivered.

## Unfinished checkouts

When a shopper types their mobile number at checkout but doesn't place the order, they appear under **Unfinished checkouts** (phone: **More**). Wait a couple of hours, then tap **Message on WhatsApp** (the message lists what they were buying) and **Mark as contacted**.

## Delivery times (PIN-code check)

In **Shop settings → Delivery times**, list the PIN-code starts near you (e.g. `411, 412`) and the days for nearby and for the rest of India. Product pages show "Delivers to 411001, Maharashtra in about 1–2 days"; checkout fills in the state from the PIN.

## Reviews

Customer reviews wait in Admin → **Reviews** until you **Publish** or **Reject** them. Use **Add a customer review** to post feedback you got on WhatsApp or in person.

## Corporate enquiries

Quote requests from the Corporate page arrive in **Corporate enquiries**. Move each one through New → Contacted → Quote sent → Won/Lost and keep notes (quote amount, follow-up date). The win rate appears at the top.

## Reading the analytics

Pick 7, 30 or 90 days. Each number shows the change from the previous period of the same length.

- **What to work on:** start here. Plain suggestions such as products people view but don't buy, searches with no results, unpaid orders and best-performing channels.
- **Where visitors drop off:** if the big drop is between *Added to cart* and *Placed order*, look at delivery charges and checkout. If it's at *Viewed a product*, look at prices and photos.
- **Where visitors come from:** compare channels by the share of visits that order, not just by visit count.
- **Products table:** low cart rate = price or photo problem; high sales + low stock = reorder.
- **Busiest hours:** send WhatsApp broadcasts and Instagram posts an hour before the peak.

Add `?utm_source=whatsapp` (or `instagram`, `flyer`) to links you share so each one shows up separately under sources, for example `https://shreeramtrading.in/products?utm_source=whatsapp_diwali`.

## Approving new website changes

When a developer finishes something, it appears on **test.shreeramtrading.in** first (red banner at the top). Check it on your phone. If you're happy, open the GitHub notification → **Review deployments** → **Approve and deploy**. The live shop updates in about two minutes. If you don't approve, nothing changes on the live shop.
