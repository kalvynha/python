"use client";

import { cn } from "@/lib/utils";

interface Props {
  onPress: (key: string) => void;
  onSubmit: () => void;
  onBackspace: () => void;
  disabled?: boolean;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function Numpad({ onPress, onSubmit, onBackspace, disabled }: Props) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onPress(k)}
          disabled={disabled}
          className={cn(
            "btn-kid h-20 text-3xl bg-white border-2 border-slate-200",
            "hover:border-sky-400 disabled:opacity-50"
          )}
          aria-label={`Number ${k}`}
        >
          {k}
        </button>
      ))}
      <button
        type="button"
        onClick={onBackspace}
        disabled={disabled}
        className="btn-kid h-20 bg-white border-2 border-slate-200 text-2xl"
        aria-label="Backspace"
      >
        ⌫
      </button>
      <button
        type="button"
        onClick={() => onPress("0")}
        disabled={disabled}
        className="btn-kid h-20 text-3xl bg-white border-2 border-slate-200"
        aria-label="Number 0"
      >
        0
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled}
        className="btn-kid h-20 bg-sky-500 text-white text-2xl"
        aria-label="Submit answer"
      >
        ✓
      </button>
    </div>
  );
}
