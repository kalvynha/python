"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { authedFetch } from "@/lib/client/authedFetch";
import { MathProblem } from "@/components/kid/MathProblem";
import { SpellingAudio } from "@/components/kid/SpellingAudio";
import { FeedbackBubble } from "@/components/kid/FeedbackBubble";
import { NavBar } from "@/components/NavBar";
import { ProgressRocket } from "@/components/kid/ProgressRocket";

interface Problem {
  id: string;
  type: "math_arith" | "spelling_audio";
  skillTag: string;
  prompt: string;
  expected: string;
  sentence?: string;
  hintLadder: string[];
}

interface Summary {
  kidSummary: string;
  parentSummary: string;
  focusSkills: string[];
  stars: number;
  streak: number;
}

export function PlayClient() {
  const router = useRouter();
  const search = useSearchParams();
  const kidId = search.get("kidId");

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [idx, setIdx] = useState(0);
  const [misses, setMisses] = useState(0);
  const [state, setState] = useState<"idle" | "correct" | "incorrect" | "reveal">("idle");
  const [summary, setSummary] = useState<Summary | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  const sessionEndAtRef = useRef<number>(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user || !kidId) return;
    (async () => {
      setLoading(true);
      const res = await authedFetch("/api/sessions/generate", {
        method: "POST",
        body: JSON.stringify({ kidId, durationS: 600 }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert("Could not start session: " + data.error);
        router.push("/profiles");
        return;
      }
      setProblems(data.problems);
      setSessionId(data.sessionId);
      sessionEndAtRef.current = Date.now() + 600_000;
      setLoading(false);
    })();
  }, [user, kidId, router]);

  if (loading || !kidId) {
    return (
      <>
        <NavBar exitTo="/profiles" exitLabel="Stop" compact />
        <main className="mx-auto max-w-xl px-6 py-20 text-center">
          Building your session…
        </main>
      </>
    );
  }

  if (summary) {
    return (
      <>
      <NavBar exitTo="/profiles" exitLabel="Done" compact />
      <main className="mx-auto max-w-xl px-6 py-16 text-center">
        <div className="text-6xl">🎉</div>
        <h1 className="mt-4 text-3xl font-bold">All done!</h1>
        <div className="mt-6 flex justify-center gap-2 text-5xl">
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={n <= summary.stars ? "" : "grayscale opacity-30"}
            >
              ⭐
            </span>
          ))}
        </div>
        {summary.streak >= 2 && (
          <p className="mt-4 text-lg text-amber-700">
            🔥 {summary.streak}-day streak — keep it up!
          </p>
        )}
        <p className="mt-6 text-xl text-slate-700">{summary.kidSummary}</p>
        <div className="mt-8 flex justify-center gap-3">
          <button onClick={() => router.push("/profiles")} className="btn-ghost">
            Back to profiles
          </button>
        </div>
      </main>
      </>
    );
  }

  const current = problems[idx];
  if (!current) {
    return <main className="mx-auto max-w-xl px-6 py-20 text-center">No problems to show.</main>;
  }

  const answer = async (given: string) => {
    const qStart = startedAtRef.current;
    const timeMs = Date.now() - qStart;
    const correct = normalize(given) === normalize(current.expected);

    await authedFetch(`/api/sessions/${sessionId}/answer`, {
      method: "POST",
      body: JSON.stringify({
        kidId,
        itemId: current.id,
        skillTag: current.skillTag,
        prompt: current.prompt,
        expected: current.expected,
        given,
        correct,
        timeMs,
        hintUsed: false,
      }),
    });

    if (correct) {
      setState("correct");
      setMisses(0);
      setTimeout(() => advance(), 800);
    } else {
      const nextMisses = misses + 1;
      setMisses(nextMisses);
      if (nextMisses >= 2) {
        setState("reveal");
        setTimeout(() => advance(), 2200);
      } else {
        setState("incorrect");
        setTimeout(() => setState("idle"), 900);
      }
    }
  };

  const advance = async () => {
    setMisses(0);
    setState("idle");
    startedAtRef.current = Date.now();
    const over = Date.now() >= sessionEndAtRef.current;
    if (idx + 1 >= problems.length || over) {
      const res = await authedFetch(`/api/sessions/${sessionId}/feedback`, {
        method: "POST",
        body: JSON.stringify({ kidId }),
      });
      const data = await res.json();
      if (res.ok) setSummary(data);
      else alert("Could not generate feedback: " + data.error);
      return;
    }
    setIdx((i) => i + 1);
  };

  return (
    <>
    <NavBar exitTo="/profiles" exitLabel="Stop" compact />
    <main className="mx-auto max-w-2xl px-4 py-8">
      <ProgressRocket current={idx} total={problems.length} />
      <div className="mt-8">
        {current.type === "math_arith" && (
          <MathProblem prompt={current.prompt} onAnswer={answer} />
        )}
        {current.type === "spelling_audio" && (
          <SpellingAudio
            word={current.prompt}
            sentence={current.sentence}
            onAnswer={answer}
          />
        )}
      </div>
      <FeedbackBubble state={state} correctAnswer={current.expected} />
    </main>
    </>
  );
}

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, "");
}
