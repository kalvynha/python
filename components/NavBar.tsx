"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface Props {
  /** Where the back button goes. Omit to hide back. */
  backTo?: string;
  /** Label for the back button. Defaults to "Back". */
  backLabel?: string;
  /** Show a big "Exit" button (distinct from back) pointing here. */
  exitTo?: string;
  /** Label for exit. Defaults to "Exit". */
  exitLabel?: string;
  /** Smaller variant used inside the session runner to keep focus on
   * the problem; hides nothing, just tightens spacing. */
  compact?: boolean;
}

export function NavBar({
  backTo,
  backLabel = "Back",
  exitTo,
  exitLabel = "Exit",
  compact = false,
}: Props) {
  const router = useRouter();
  return (
    <header
      className={
        "sticky top-0 z-20 flex w-full items-center justify-between gap-2 " +
        "bg-white/80 backdrop-blur px-3 sm:px-6 " +
        (compact ? "py-2" : "py-3")
      }
    >
      <Link
        href="/"
        className="flex min-w-0 flex-1 items-center gap-2"
        aria-label="Home"
      >
        <Image
          src="/logo.png"
          alt="Quality Learing Center"
          width={compact ? 120 : 170}
          height={compact ? 50 : 70}
          priority
          className="h-10 w-auto max-w-[45vw] object-contain sm:h-14"
        />
      </Link>

      <div className="flex shrink-0 items-center gap-2">
        {backTo && (
          <button
            type="button"
            onClick={() => router.push(backTo)}
            className="rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-sky-400 sm:px-4 sm:text-base"
            aria-label={backLabel}
          >
            <span aria-hidden>←</span>
            <span className="ml-1 hidden sm:inline">{backLabel}</span>
          </button>
        )}
        {exitTo && (
          <Link
            href={exitTo}
            className="rounded-xl bg-rose-500 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-600 sm:px-4 sm:text-base"
            aria-label={exitLabel}
          >
            {exitLabel}
          </Link>
        )}
      </div>
    </header>
  );
}
