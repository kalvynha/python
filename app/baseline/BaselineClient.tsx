"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { authedFetch } from "@/lib/client/authedFetch";
import { buildBaseline } from "@/lib/curriculum/baseline";
import { MathProblem } from "@/components/kid/MathProblem";
import { SpellingAudio } from "@/components/kid/SpellingAudio";
import { FeedbackBubble } from "@/components/kid/FeedbackBubble";
import { ProgressRocket } from "@/components/kid/ProgressRocket";

export function BaselineClient() {
  const router = useRouter();
  const search = useSearchParams();
  const kidId = search.get("kidId");
  const [user, setUser] = useState<User | null>(null);

  const questions = useMemo(() => buildBaseline(), []);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [state, setState] = useState<"idle" | "correct" | "incorrect">("idle");
  const [done, setDone] = useState<null | { math: number; spelling: number }>(
    null
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), setUser);
    return () => unsub();
  }, []);

  if (!kidId) {
    return (
      <main className="mx-auto max-w-xl px-6 py-20 text-center">
        Missing kid id.
      </main>
    );
  }
  if (!user) {
    return (
      <main className="mx-auto max-w-xl px-6 py-20 text-center">
        Please sign in first.
      </main>
    );
  }

  if (done) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16 text-center">
        <div className="text-6xl">🌟</div>
        <h1 className="mt-4 text-3xl font-bold">You're all set!</h1>
        <p className="mt-3 text-slate-700">
          We'll start math at level {done.math} and spelling at level{" "}
          {done.spelling}. The app adapts from here.
        </p>
        <button
          onClick={() => router.push(`/play?kidId=${kidId}`)}
          className="btn-primary mt-8"
        >
          Start first session
        </button>
      </main>
    );
  }

  const current = questions[idx];

  const onAnswer = async (given: string) => {
    const correct =
      given.trim().toLowerCase().replace(/\s+/g, "") ===
      current.expected.trim().toLowerCase().replace(/\s+/g, "");
    const nextAnswers = { ...answers, [current.id]: correct };
    setAnswers(nextAnswers);
    setState(correct ? "correct" : "incorrect");

    setTimeout(async () => {
      setState("idle");
      if (idx + 1 >= questions.length) {
        const res = await authedFetch("/api/baseline/finish", {
          method: "POST",
          body: JSON.stringify({ kidId, answers: nextAnswers }),
        });
        if (res.ok) setDone(await res.json());
        else alert("Could not finish baseline: " + (await res.text()));
      } else {
        setIdx((i) => i + 1);
      }
    }, 700);
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <p className="mb-3 text-center text-sm text-slate-500">
        Quick warm-up so we can find your level
      </p>
      <ProgressRocket current={idx} total={questions.length} />
      <div className="mt-8">
        {current.type === "math_arith" ? (
          <MathProblem prompt={current.prompt} onAnswer={onAnswer} />
        ) : (
          <SpellingAudio
            word={current.prompt}
            sentence={current.sentence}
            onAnswer={onAnswer}
          />
        )}
      </div>
      <FeedbackBubble state={state} correctAnswer={current.expected} />
    </main>
  );
}
