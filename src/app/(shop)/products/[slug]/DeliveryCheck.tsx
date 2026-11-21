"use client";

import { useState } from "react";
import { deliveryDays, isValidPin, stateForPin } from "@/lib/delivery";
import { rupees } from "@/lib/format";

type S = { localPinPrefixes: string; localDays: string; otherDays: string; freeShippingAbove: number; codEnabled: boolean };

/** "Do you deliver to me, and when?" before the shopper reaches checkout. */
export function DeliveryCheck({ settings }: { settings: S }) {
  const [pin, setPin] = useState("");
  const [result, setResult] = useState<string | null>(null);

  return (
    <form
      className="mt-4 rounded-tile border border-paper-line bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!isValidPin(pin)) {
          setResult("Enter a 6-digit PIN code");
          return;
        }
        try {
          localStorage.setItem("srt_pin", pin);
        } catch {
          /* ignore */
        }
        const st = stateForPin(pin);
        setResult(`Delivers to ${pin}${st ? `, ${st}` : ""} in about ${deliveryDays(pin, settings)} days after dispatch.`);
      }}
    >
      <label htmlFor="pin-check" className="label">
        Check delivery to your PIN code
      </label>
      <div className="flex gap-2">
        <input
          id="pin-check"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={6}
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, ""));
            setResult(null);
          }}
          placeholder="e.g. 411001"
          className="input rate-num"
        />
        <button type="submit" className="btn-ghost shrink-0">
          Check
        </button>
      </div>
      <p className="mt-2 text-sm text-ink-soft" aria-live="polite">
        {result ?? `Free delivery above ${rupees(settings.freeShippingAbove)}${settings.codEnabled ? " · Cash on delivery available" : ""}.`}
      </p>
    </form>
  );
}
