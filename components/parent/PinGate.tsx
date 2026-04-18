"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "parent_pin_ok_until";
const OK_DURATION_MS = 15 * 60 * 1000;

/**
 * Soft PIN gate to keep kids out of the parent area mid-session.
 * Not a real security boundary — that's handled by Firebase Auth. This
 * just prevents a curious 7-year-old from tapping through.
 */
export function PinGate({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState(false);
  const [entry, setEntry] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const until = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
    if (until > Date.now()) setOk(true);
  }, []);

  if (ok) return <>{children}</>;

  const pin = getOrCreatePin();
  const submit = () => {
    if (entry === pin) {
      localStorage.setItem(STORAGE_KEY, String(Date.now() + OK_DURATION_MS));
      setOk(true);
    } else {
      setError("Nope — try again.");
      setEntry("");
    }
  };

  return (
    <main className="mx-auto max-w-md px-6 py-20 text-center">
      <h1 className="text-2xl font-semibold">Grown-ups only</h1>
      <p className="mt-2 text-slate-600">Enter your 4-digit PIN.</p>
      <input
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        value={entry}
        onChange={(e) => {
          setError(null);
          setEntry(e.target.value.replace(/\D/g, ""));
        }}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        className="mt-6 w-full rounded-2xl border-2 border-slate-200 px-4 py-4 text-center text-3xl tracking-[0.5em] focus:border-sky-400 focus:outline-none"
      />
      {error && <p className="mt-2 text-rose-600">{error}</p>}
      <button onClick={submit} className="btn-primary mt-6 w-full">
        Unlock
      </button>
      <p className="mt-6 text-xs text-slate-400">
        First-time PIN is <strong>{pin}</strong>. Change it in settings.
      </p>
    </main>
  );
}

function getOrCreatePin(): string {
  const existing = localStorage.getItem("parent_pin");
  if (existing) return existing;
  // Default to 1234 — user is expected to change this. Real PIN storage
  // should be hashed server-side; this client-side gate is just a nudge.
  localStorage.setItem("parent_pin", "1234");
  return "1234";
}
