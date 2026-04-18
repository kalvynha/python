"use client";

/**
 * Simple visual manipulatives for early math. Shown inline with the
 * problem for kids at difficulty 1 (add/sub within 10) to support
 * counting. Stays tiny and neutral — no animation, no distractions.
 */

interface Props {
  /** Math expression like "3 + 2" or "7 - 4". */
  prompt: string;
}

export function Manipulatives({ prompt }: Props) {
  const parsed = parseExpression(prompt);
  if (!parsed) return null;
  const { a, b, op } = parsed;
  if (a > 10 || b > 10) return null;

  return (
    <div className="mt-4 flex flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        <DotGroup n={a} color="sky" />
        <span className="text-3xl font-bold text-slate-500" aria-hidden>
          {op === "+" ? "+" : "−"}
        </span>
        <DotGroup n={b} color={op === "+" ? "sky" : "slate"} strikethrough={op === "−"} />
      </div>
    </div>
  );
}

function DotGroup({
  n,
  color,
  strikethrough,
}: {
  n: number;
  color: "sky" | "slate";
  strikethrough?: boolean;
}) {
  const dots = Array.from({ length: n });
  return (
    <div className="relative grid grid-cols-5 gap-1">
      {dots.map((_, i) => (
        <span
          key={i}
          className={
            "inline-block h-4 w-4 rounded-full " +
            (color === "sky" ? "bg-sky-400" : "bg-slate-300")
          }
        />
      ))}
      {strikethrough && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 m-auto h-[2px] w-full rotate-[-8deg] bg-slate-500"
        />
      )}
    </div>
  );
}

function parseExpression(
  prompt: string
): { a: number; b: number; op: "+" | "−" } | null {
  // Match like "3 + 2" or "7 − 4" (en-dash minus) or "7 - 4".
  const m = prompt.match(/^\s*(\d+)\s*([+\-−])\s*(\d+)\s*$/);
  if (!m) return null;
  const a = parseInt(m[1], 10);
  const b = parseInt(m[3], 10);
  const op = m[2] === "+" ? "+" : "−";
  return { a, b, op };
}
