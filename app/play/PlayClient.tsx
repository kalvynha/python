"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { authedFetch } from "@/lib/client/authedFetch";
import {
  chimeComplete,
  chimeCorrect,
  chimeIncorrect,
} from "@/lib/client/sfx";
import { MathProblem } from "@/components/kid/MathProblem";
import { SpellingAudio } from "@/components/kid/SpellingAudio";
import { FeedbackBubble } from "@/components/kid/FeedbackBubble";
import { ProgressRocket } from "@/components/kid/ProgressRocket";
import { SessionTimer } from "@/components/kid/SessionTimer";
import { SessionGreeting } from "@/components/kid/SessionGreeting";
import { SessionModePicker } from "@/components/kid/SessionModePicker";
import { RewardTeaser } from "@/components/kid/RewardTeaser";
import { NavBar } from "@/components/NavBar";

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
  parentSummary: string;
  focusSkills: string[];
  stars: number;
  streak: number;
  correctCount: number;
  questionCount: number;
}

export function PlayClient() {
  const router = useRouter();
  const search = useSearchParams();
  const kidId = search.get("kidId");

  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<null | "math" | "spelling" | "both">(null);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [kidName, setKidName] = useState<string>("");
  const [greetingDone, setGreetingDone] = useState(false);
  const [rewards, setRewards] = useState<
    Array<{ id: string; title: string; emoji: string; costStars: number }>
  >([]);
  const [availableStars, setAvailableStars] = useState(0);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [idx, setIdx] = useState(0);
  const [misses, setMisses] = useState(0);
  const [state, setState] = useState<
    "idle" | "correct" | "incorrect" | "reveal" | "hint"
  >("idle");
  const [hintText, setHintText] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const startedAtRef = useRef<number>(Date.now());
  const sessionEndAtRef = useRef<number>(0);

  // Reset per-question timer whenever the kid sees a new question.
  useEffect(() => {
    if (!loading && problems.length > 0) {
      startedAtRef.current = Date.now();
    }
  }, [idx, loading, problems.length]);

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user || !kidId || !mode) return;
    (async () => {
      setLoading(true);
      // Translate the picker's choice into a subjectMix. "both" omits
      // the override so the server falls back to the parent-configured
      // mix (defaults to 50/50 if unset).
      const subjectMix =
        mode === "math"
          ? { math: 1, spelling: 0 }
          : mode === "spelling"
            ? { math: 0, spelling: 1 }
            : undefined;
      const res = await authedFetch("/api/sessions/generate", {
        method: "POST",
        body: JSON.stringify({ kidId, subjectMix }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert("Could not start session: " + data.error);
        router.push("/profiles");
        return;
      }
      setProblems(data.problems);
      setSessionId(data.sessionId);
      setKidName(data.kidName ?? "");
      setRewards(data.rewards ?? []);
      setAvailableStars(data.availableStars ?? 0);
      const durationS = data.durationS ?? 600;
      sessionEndAtRef.current = Date.now() + durationS * 1000;
      setLoading(false);
    })();
  }, [user, kidId, mode, router]);

  // Fire confetti when the summary arrives.
  useEffect(() => {
    if (!summary) return;
    chimeComplete();
    const burst = (n: number, delay: number) =>
      setTimeout(() => {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#0ea5e9", "#f59e0b", "#10b981", "#ec4899"],
        });
      }, delay);
    burst(1, 0);
    burst(2, 250);
    burst(3, 600);
  }, [summary]);

  if (!kidId) {
    return (
      <main className="mx-auto max-w-xl px-6 py-20 text-center">
        Missing kid id.
      </main>
    );
  }

  // First gate: let the kid pick what to practice today. No session is
  // generated until they choose.
  if (!mode) {
    return (
      <>
        <NavBar backTo="/profiles" compact />
        <SessionModePicker onPick={(m) => setMode(m)} />
      </>
    );
  }

  if (loading) {
    return (
      <>
        <NavBar
          exitTo="/profiles"
          exitLabel="Stop"
          confirmExit="Stop this practice session? Your progress so far is saved."
          compact
        />
        <main className="mx-auto max-w-xl px-6 py-20 text-center">
          Building your session…
        </main>
      </>
    );
  }

  if (feedbackLoading) {
    return (
      <>
        <NavBar compact />
        <main className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-sky-200 border-t-sky-500" />
          <h1 className="mt-8 text-2xl font-bold text-slate-800">
            Nice work — totaling it up!
          </h1>
          <p className="mt-2 text-slate-500">
            We're writing your personal feedback.
          </p>
        </main>
      </>
    );
  }

  if (summary) {
    return (
      <>
        <NavBar exitTo="/profiles" exitLabel="Done" compact />
        <main className="mx-auto max-w-xl px-6 py-12 text-center">
          <div className="text-6xl">🎉</div>
          <h1 className="mt-4 text-3xl font-bold">All done!</h1>
          <p className="mt-3 text-2xl font-semibold text-slate-800">
            You got {summary.correctCount} out of {summary.questionCount}!
          </p>
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
          <RewardTeaser
            availableStars={availableStars + summary.stars}
            rewards={rewards}
            variant="summary"
          />
          <div className="mt-10 flex flex-col items-center gap-3">
            <button
              onClick={() => {
                window.location.href = `/play?kidId=${kidId}&t=${Date.now()}`;
              }}
              className="btn-primary w-full max-w-xs"
            >
              Keep going →
            </button>
            <button
              onClick={() => router.push(`/rewards?kidId=${kidId}`)}
              className="btn-ghost w-full max-w-xs"
            >
              See rewards ⭐
            </button>
          </div>
        </main>
      </>
    );
  }

  if (!greetingDone) {
    return (
      <>
        <NavBar
          exitTo="/profiles"
          exitLabel="Stop"
          confirmExit="Stop this practice session? Your progress so far is saved."
          compact
        />
        <SessionGreeting
          name={kidName || "friend"}
          availableStars={availableStars}
          rewards={rewards}
          onDone={() => setGreetingDone(true)}
        />
      </>
    );
  }

  const current = problems[idx];
  if (!current) {
    return (
      <main className="mx-auto max-w-xl px-6 py-20 text-center">
        No problems to show.
      </main>
    );
  }

  const answer = async (given: string) => {
    if (submitting) return;
    setSubmitting(true);

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
        hintUsed: misses > 0,
      }),
    });

    if (correct) {
      chimeCorrect();
      setState("correct");
      setHintText(null);
      setMisses(0);
      setTimeout(() => advance(), 800);
    } else {
      chimeIncorrect();
      const nextMisses = misses + 1;
      setMisses(nextMisses);
      if (nextMisses >= 2) {
        setState("reveal");
        setHintText(null);
        setTimeout(() => advance(), 3200);
      } else {
        const hint = current.hintLadder?.[0] ?? null;
        setHintText(hint);
        setState(hint ? "hint" : "incorrect");
        setTimeout(
          () => {
            setState("idle");
            setHintText(null);
            setSubmitting(false);
          },
          hint ? 1800 : 900
        );
      }
    }
  };

  const advance = async () => {
    setMisses(0);
    setState("idle");
    startedAtRef.current = Date.now();
    const over = Date.now() >= sessionEndAtRef.current;
    if (idx + 1 >= problems.length || over) {
      setFeedbackLoading(true);
      const res = await authedFetch(`/api/sessions/${sessionId}/feedback`, {
        method: "POST",
        body: JSON.stringify({ kidId }),
      });
      const data = await res.json();
      setFeedbackLoading(false);
      if (res.ok) setSummary(data);
      else alert("Could not generate feedback: " + data.error);
      return;
    }
    setIdx((i) => i + 1);
    setSubmitting(false);
  };

  // Show dot manipulatives for early-level math only.
  const isEarlyMath =
    current.type === "math_arith" &&
    (current.skillTag === "add_within_10" ||
      current.skillTag === "sub_within_10");

  return (
    <>
      <NavBar
        exitTo="/profiles"
        exitLabel="Stop"
        confirmExit="Stop this practice session? Your progress so far is saved."
        compact
      />
      <main className="mx-auto max-w-2xl px-4 py-4 sm:py-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <ProgressRocket current={idx} total={problems.length} />
          </div>
          <SessionTimer
            endAtMs={sessionEndAtRef.current}
            show={sessionEndAtRef.current > 0}
          />
        </div>
        <FeedbackBubble
          state={state}
          correctAnswer={current.expected}
          hint={hintText}
        />
        <div className="mt-6">
          {current.type === "math_arith" && (
            <MathProblem
              prompt={current.prompt}
              onAnswer={answer}
              disabled={submitting}
              showManipulatives={isEarlyMath}
            />
          )}
          {current.type === "spelling_audio" && (
            <SpellingAudio
              word={current.prompt}
              sentence={current.sentence}
              onAnswer={answer}
              disabled={submitting}
            />
          )}
        </div>
      </main>
    </>
  );
}

function normalize(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[.,!?;:"'`]/g, "");
}
