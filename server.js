// Shree Ram Trading Company: shop backend.
// Zero dependencies (Node 18+). Serves the app from ./public, keeps products and
// orders in ./data/db.json, and takes payments through Razorpay.
//
// Environment:
//   PORT                     default 3000
//   ADMIN_PIN                owner panel PIN (required in production)
//   APP_SECRET               random string used to sign owner and receipt tokens
//   RAZORPAY_KEY_ID          from Razorpay Dashboard > Settings > API Keys
//   RAZORPAY_KEY_SECRET      same place; never put this in the app or in chat
//   RAZORPAY_WEBHOOK_SECRET  set when adding the webhook in the Razorpay Dashboard
//   RAZORPAY_MOCK=1          fake Razorpay for local testing (no real money)

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = +process.env.PORT || 3000;
const ADMIN_PIN = process.env.ADMIN_PIN || '1234';
const APP_SECRET = process.env.APP_SECRET || 'change-me-' + ADMIN_PIN;
const KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';
const MOCK = process.env.RAZORPAY_MOCK === '1';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PUBLIC = path.join(__dirname, 'public');

/* ---------- storage ---------- */
const DEFAULT_SETTINGS = { payee: 'Shree Ram Trading Company', originPin: '110006', freeShipAbove: 999, shipFee: 79,
  tiers: [{ min: 25, off: 5 }, { min: 100, off: 10 }, { min: 500, off: 15 }] };
function loadDb() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch { return { products: require('./seed-products.json'), settings: DEFAULT_SETTINGS, orders: [], quotes: [] }; }
}
let db = loadDb();
function saveDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 1));
  fs.renameSync(tmp, DB_FILE);
}

/* ---------- pricing and delivery (server is the source of truth) ---------- */
const tierOff = qty => db.settings.tiers.reduce((off, t) => (qty >= t.min ? t.off : off), 0);
function priceOrder(p, qty, corp) {
  const gross = p.price * qty;
  const off = corp ? tierOff(qty) : 0;
  const discount = Math.round(gross * off / 100);
  const net = gross - discount;
  const shipping = corp || net >= db.settings.freeShipAbove ? 0 : db.settings.shipFee;
  return { gross, off, discount, shipping, total: net + shipping };
}
function addWorkingDays(d, n) { const x = new Date(d); let a = 0; while (a < n) { x.setDate(x.getDate() + 1); if (x.getDay() !== 0) a++; } return x; }
function etaFor(pin, from = new Date()) {
  const o = db.settings.originPin; let min, max;
  if (pin.slice(0, 3) === o.slice(0, 3)) { min = 1; max = 1; }
  else if (pin[0] === o[0]) { min = 2; max = 3; }
  else if (Math.abs(+pin[0] - +o[0]) <= 2) { min = 3; max = 5; }
  else { min = 4; max = 6; }
  const ist = new Date(from.getTime() + 330 * 60000); // shop runs on IST; 4 pm cutoff
  const start = ist.getUTCHours() >= 16 ? addWorkingDays(from, 1) : from;
  return { from: addWorkingDays(start, min).toISOString(), to: addWorkingDays(start, max).toISOString(), days: [min, max] };
}

/* ---------- tokens ---------- */
const hmac = (key, s) => crypto.createHmac('sha256', key).update(s).digest('hex');
const safeEq = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const adminToken = () => { const exp = Date.now() + 12 * 3600e3; return exp + '.' + hmac(APP_SECRET, 'admin:' + exp); };
const isAdmin = req => { const [exp, sig] = String(req.headers['x-admin-token'] || '').split('.'); return sig && +exp > Date.now() && safeEq(sig, hmac(APP_SECRET, 'admin:' + exp)); };
const receiptToken = id => hmac(APP_SECRET, 'order:' + id).slice(0, 24);

/* ---------- Razorpay ---------- */
async function razorpayCreateOrder(amountPaise, receipt, notes) {
  if (MOCK) return { id: 'order_mock' + crypto.randomBytes(6).toString('hex'), amount: amountPaise, currency: 'INR', status: 'created' };
  const r = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + Buffer.from(KEY_ID + ':' + KEY_SECRET).toString('base64') },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt, notes }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error('Razorpay: ' + (j.error?.description || r.status));
  return j;
}
const SIGN_KEY = MOCK ? 'mock-secret' : KEY_SECRET;
const checkoutSignatureOk = (orderId, paymentId, sig) => !!SIGN_KEY && !!sig && safeEq(hmac(SIGN_KEY, orderId + '|' + paymentId), sig.padEnd(64).slice(0, 64));

function markPaid(order, paymentId, via) {
  if (order.status !== 'awaiting_payment') return false;
  order.status = 'paid'; order.paymentId = paymentId; order.paidAt = new Date().toISOString(); order.confirmedBy = via;
  const p = db.products.find(x => x.id === order.items[0].pid);
  if (p) p.stock = Math.max(0, p.stock - order.items[0].qty);
  saveDb();
  return true;
}

/* ---------- validation ---------- */
const PIN_RE = /^[1-8]\d{5}$/, PHONE_RE = /^[6-9]\d{9}$/, EMAIL_RE = /^\S+@\S+\.\S+$/, GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;
function cleanCustomer(c = {}, corp) {
  const out = { name: String(c.name || '').trim().slice(0, 80), phone: String(c.phone || '').replace(/\D/g, ''), email: String(c.email || '').trim().slice(0, 120),
    address: String(c.address || '').trim().slice(0, 300), pin: String(c.pin || '').trim(), company: String(c.company || '').trim().slice(0, 120), gstin: String(c.gstin || '').trim().toUpperCase() };
  const err = !out.name ? 'Enter your full name.' : !PHONE_RE.test(out.phone) ? 'Enter a 10-digit mobile number.' : !EMAIL_RE.test(out.email) ? 'Enter a valid email address.'
    : out.address.length < 10 ? 'Enter the full delivery address.' : !PIN_RE.test(out.pin) ? 'Enter a valid 6-digit pincode.'
    : corp && !out.company ? 'Enter your company name.' : out.gstin && !GSTIN_RE.test(out.gstin) ? 'That GSTIN looks wrong.' : '';
  return { out, err };
}
const publicOrder = o => ({ ...o, token: undefined, razorpayOrderId: undefined });

/* ---------- http helpers ---------- */
const send = (res, code, body) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
function readBody(req, limit = 6e6) {
  return new Promise((ok, bad) => { let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > limit) { bad(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => ok(Buffer.concat(chunks))); req.on('error', bad); });
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };

/* ---------- routes ---------- */
async function api(req, res, url) {
  const m = req.method, p = url.pathname;
  const raw = ['POST', 'PUT', 'PATCH'].includes(m) ? await readBody(req) : Buffer.alloc(0);
  const body = () => { try { return JSON.parse(raw.toString() || '{}'); } catch { return {}; } };

  if (m === 'GET' && p === '/api/config')
    return send(res, 200, { mode: 'server', gateway: MOCK ? 'mock' : KEY_ID ? 'razorpay' : 'none', keyId: KEY_ID, settings: db.settings });
  if (m === 'GET' && p === '/api/products') return send(res, 200, db.products.filter(x => !x.hidden));

  // Customer places an order: price is computed here, never trusted from the browser.
  if (m === 'POST' && p === '/api/orders') {
    const b = body(); const prod = db.products.find(x => x.id === b.pid);
    const qty = Math.floor(+b.qty);
    if (!prod) return send(res, 400, { error: 'That product is no longer available.' });
    if (!(qty >= 1 && qty <= 9999)) return send(res, 400, { error: 'Choose a quantity between 1 and 9999.' });
    if (qty > prod.stock) return send(res, 400, { error: `Only ${prod.stock} left in stock.` });
    const corp = !!b.corp; const { out: customer, err } = cleanCustomer(b.customer, corp);
    if (err) return send(res, 400, { error: err });
    if (!MOCK && !KEY_ID) return send(res, 503, { error: 'Online payment is not set up yet.' });
    const c = priceOrder(prod, qty, corp);
    const id = 'SRT' + Date.now().toString().slice(-8) + crypto.randomInt(10, 99);
    const rz = await razorpayCreateOrder(c.total * 100, id, { shop_order: id, phone: customer.phone });
    const order = { id, createdAt: new Date().toISOString(), status: 'awaiting_payment', section: corp ? 'corporate' : 'individual', customer,
      items: [{ pid: prod.id, name: prod.name, pack: prod.pack, price: prod.price, qty }], off: c.off, discount: c.discount, shipping: c.shipping, total: c.total,
      gift: b.gift && b.gift.msg ? { msg: String(b.gift.msg).slice(0, 300), hidePrice: true } : null, eta: etaFor(customer.pin), razorpayOrderId: rz.id };
    db.orders.push(order); saveDb();
    return send(res, 200, { order: publicOrder(order), token: receiptToken(id), razorpay: { orderId: rz.id, amount: rz.amount, keyId: KEY_ID, name: db.settings.payee } });
  }

  // Checkout handler sends Razorpay's signed result here.
  let mm;
  if (m === 'POST' && (mm = p.match(/^\/api\/orders\/(\w+)\/verify$/))) {
    const o = db.orders.find(x => x.id === mm[1]); const b = body();
    if (!o) return send(res, 404, { error: 'Order not found.' });
    if (b.razorpay_order_id !== o.razorpayOrderId || !checkoutSignatureOk(o.razorpayOrderId, String(b.razorpay_payment_id || ''), String(b.razorpay_signature || '')))
      return send(res, 400, { error: 'We could not confirm this payment. If money left your account, it will be refunded automatically by Razorpay or confirmed within a few minutes.' });
    markPaid(o, b.razorpay_payment_id, 'checkout');
    return send(res, 200, { order: publicOrder(o) });
  }

  // Receipt: needs the token given at order time.
  if (m === 'GET' && (mm = p.match(/^\/api\/orders\/(\w+)$/))) {
    const o = db.orders.find(x => x.id === mm[1]); const t = url.searchParams.get('t') || '';
    if (!o || !safeEq(t.padEnd(24).slice(0, 24), receiptToken(o.id))) return send(res, 404, { error: 'Order not found.' });
    return send(res, 200, { order: publicOrder(o) });
  }

  // Razorpay webhook: confirms payments even if the customer closed the app.
  if (m === 'POST' && p === '/api/razorpay/webhook') {
    const sig = String(req.headers['x-razorpay-signature'] || '');
    if (!WEBHOOK_SECRET || !safeEq(hmac(WEBHOOK_SECRET, raw), sig.padEnd(64).slice(0, 64))) return send(res, 400, { error: 'bad signature' });
    const ev = body(); const pay = ev.payload?.payment?.entity;
    if (pay && ['payment.captured', 'order.paid'].includes(ev.event)) {
      const o = db.orders.find(x => x.razorpayOrderId === pay.order_id);
      if (o && pay.amount === o.total * 100) markPaid(o, pay.id, 'webhook');
    }
    return send(res, 200, { ok: true });
  }

  // Test-only stand-in for the Razorpay payment window.
  if (MOCK && m === 'POST' && p === '/api/mock/pay') {
    const oid = String(body().orderId || ''), pid = 'pay_mock' + crypto.randomBytes(6).toString('hex');
    return send(res, 200, { razorpay_order_id: oid, razorpay_payment_id: pid, razorpay_signature: hmac(SIGN_KEY, oid + '|' + pid) });
  }

  if (m === 'POST' && p === '/api/quotes') { const b = body(); db.quotes.push({ ...b, at: new Date().toISOString() }); saveDb(); return send(res, 200, { ok: true }); }

  /* owner panel */
  if (m === 'POST' && p === '/api/admin/login') {
    const pin = String(body().pin || '');
    return safeEq(hmac(APP_SECRET, pin), hmac(APP_SECRET, ADMIN_PIN)) ? send(res, 200, { token: adminToken() }) : send(res, 401, { error: 'That PIN is not right.' });
  }
  if (p.startsWith('/api/admin/') && !isAdmin(req)) return send(res, 401, { error: 'Unlock the owner panel again.' });
  if (m === 'GET' && p === '/api/admin/orders') return send(res, 200, db.orders.filter(o => o.status !== 'awaiting_payment' || Date.now() - new Date(o.createdAt) < 864e5).map(publicOrder));
  if (m === 'GET' && p === '/api/admin/quotes') return send(res, 200, db.quotes);
  if (m === 'PUT' && (mm = p.match(/^\/api\/admin\/products\/(\w+)$/))) {
    const b = body(); const pr = { id: mm[1], name: String(b.name || '').trim(), brief: String(b.brief || ''), price: +b.price, mrp: +b.mrp || +b.price, pack: String(b.pack || ''),
      stock: +b.stock || 0, cat: String(b.cat || 'Dry fruits'), section: ['both', 'individual', 'corporate'].includes(b.section) ? b.section : 'both',
      origin: String(b.origin || ''), packedOn: String(b.packedOn || ''), art: String(b.art || 'almond'), img: typeof b.img === 'string' && b.img.startsWith('data:image/') ? b.img : null };
    if (!pr.name || !(pr.price > 0) || !pr.pack) return send(res, 400, { error: 'Add a name, a price and the package quantity.' });
    const i = db.products.findIndex(x => x.id === pr.id); if (i >= 0) db.products[i] = pr; else db.products.push(pr);
    saveDb(); return send(res, 200, pr);
  }
  if (m === 'DELETE' && (mm = p.match(/^\/api\/admin\/products\/(\w+)$/))) { db.products = db.products.filter(x => x.id !== mm[1]); saveDb(); return send(res, 200, { ok: true }); }
  if (m === 'PATCH' && (mm = p.match(/^\/api\/admin\/orders\/(\w+)$/))) {
    const o = db.orders.find(x => x.id === mm[1]); const s = body().status;
    if (!o || !['paid', 'packed', 'shipped', 'delivered'].includes(s) || o.status === 'awaiting_payment') return send(res, 400, { error: 'Only paid orders can move to packed, shipped or delivered.' });
    o.status = s; saveDb(); return send(res, 200, publicOrder(o));
  }
  if (m === 'PUT' && p === '/api/admin/settings') {
    const b = body(); if (!PIN_RE.test(String(b.originPin))) return send(res, 400, { error: 'Enter a valid 6-digit shop pincode.' });
    db.settings = { ...db.settings, payee: String(b.payee || db.settings.payee), originPin: String(b.originPin), freeShipAbove: +b.freeShipAbove || 0,
      tiers: (Array.isArray(b.tiers) ? b.tiers : db.settings.tiers).map(t => ({ min: +t.min, off: +t.off })).filter(t => t.min > 0).sort((a, c) => a.min - c.min) };
    saveDb(); return send(res, 200, db.settings);
  }
  return send(res, 404, { error: 'Not found' });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    const f = path.join(PUBLIC, path.normalize(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!f.startsWith(PUBLIC) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  } catch (e) { console.error(e); send(res, 500, { error: 'Something went wrong. Please try again.' }); }
});
if (require.main === module) server.listen(PORT, () => console.log(`Shree Ram shop on http://localhost:${PORT} (payments: ${MOCK ? 'MOCK' : KEY_ID ? 'Razorpay' : 'not set up'})`));
module.exports = { server, hmac };
