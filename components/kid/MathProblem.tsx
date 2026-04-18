"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Numpad } from "./Numpad";

interface Props {
  prompt: string; // "12 + 7"
  onAnswer: (given: string) => void;
  disabled?: boolean;
}

export function MathProblem({ prompt, onAnswer, disabled }: Props) {
  const [entry, setEntry] = useState("");

  const submit = () => {
    if (!entry) return;
    onAnswer(entry);
    setEntry("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-md"
    >
      <div className="rounded-3xl bg-white p-8 text-center shadow-md">
        <div className="text-kid-xl font-bold tabular-nums text-slate-900">
          {prompt} = <span className="text-sky-500">{entry || "?"}</span>
        </div>
      </div>
      <div className="mt-6">
        <Numpad
          disabled={disabled}
          onPress={(k) => setEntry((e) => (e.length < 6 ? e + k : e))}
          onBackspace={() => setEntry((e) => e.slice(0, -1))}
          onSubmit={submit}
        />
      </div>
    </motion.div>
  );
}
