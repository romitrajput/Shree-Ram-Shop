// PIN-code helpers shared by the product page check and checkout. Safe on server and client.

/** Indian PIN codes: first two digits -> state, where the range maps to exactly one state. */
const PIN_STATE: [number, number, string][] = [
  [11, 11, "Delhi"], [12, 13, "Haryana"], [14, 15, "Punjab"], [16, 16, "Chandigarh"], [17, 17, "Himachal Pradesh"],
  [30, 34, "Rajasthan"], [36, 39, "Gujarat"], [40, 40, "Maharashtra"], [41, 44, "Maharashtra"], [45, 48, "Madhya Pradesh"],
  [49, 49, "Chhattisgarh"], [56, 59, "Karnataka"], [60, 64, "Tamil Nadu"], [67, 69, "Kerala"], [70, 74, "West Bengal"],
  [75, 77, "Odisha"], [78, 78, "Assam"], [82, 83, "Jharkhand"], [84, 85, "Bihar"], [20, 23, "Uttar Pradesh"], [27, 28, "Uttar Pradesh"]
];

export function isValidPin(pin: string) {
  return /^[1-9]\d{5}$/.test(pin);
}

/** State for a PIN, or null when the range covers several states (e.g. 50–53 Telangana/Andhra). */
export function stateForPin(pin: string): string | null {
  if (!isValidPin(pin)) return null;
  const two = Number(pin.slice(0, 2));
  return PIN_STATE.find(([a, b]) => two >= a && two <= b)?.[2] ?? null;
}

export function deliveryDays(pin: string, s: { localPinPrefixes: string; localDays: string; otherDays: string }) {
  const local = s.localPinPrefixes
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .some((p) => pin.startsWith(p));
  return local ? s.localDays : s.otherDays;
}
