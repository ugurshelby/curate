"use client";

import React, { useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import { unlockDevice } from "@/lib/access/client";
import { safeNext } from "@/lib/access/session";
import { AI_PIN_LENGTH } from "@/lib/ai/config";

/**
 * Whole-app PIN gate (D27). The middleware sends every page here until the device has a valid session
 * cookie. The PIN goes once to our own API and is never stored in the browser.
 */
export default function LockPage() {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async (digits: string) => {
    setBusy(true);
    setError(null);
    const r = await unlockDevice(digits);
    if (r.ok) {
      window.location.replace(safeNext(new URLSearchParams(window.location.search).get("next")));
      return;
    }
    setError(r.message);
    setPin("");
    setBusy(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  // Digits only; sent by itself on the 4th digit
  const onChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, AI_PIN_LENGTH);
    setPin(digits);
    if (digits.length === AI_PIN_LENGTH) void submit(digits);
  };

  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center gap-6 px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex flex-col items-center gap-2 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" width={64} height={64} className="w-16 h-16 rounded-lg" />
        <h1 className="text-display text-ink-1">{tr.lock.title}</h1>
        <p className="text-body text-ink-2">{tr.lock.prompt}</p>
      </div>

      <label htmlFor="lock-pin" className="relative block">
        <span className="sr-only">{tr.lock.pinLabel}</span>
        <div className="flex gap-3" aria-hidden="true">
          {Array.from({ length: AI_PIN_LENGTH }, (_, i) => (
            <div
              key={i}
              className={`w-14 h-16 rounded-md border bg-surface flex items-center justify-center text-title text-ink-1 ${
                i === pin.length && !busy ? "border-accent" : "border-separator"
              }`}
            >
              {pin[i] ? "•" : ""}
            </div>
          ))}
        </div>
        <input
          id="lock-pin"
          ref={inputRef}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          maxLength={AI_PIN_LENGTH}
          value={pin}
          disabled={busy}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0"
        />
      </label>

      <p role="alert" className="min-h-[20px] text-subhead text-danger text-center">
        {error ?? ""}
      </p>
      <p className="text-footnote text-ink-3 text-center" aria-live="polite">
        {busy ? tr.lock.checking : tr.lock.remembered}
      </p>
    </main>
  );
}
