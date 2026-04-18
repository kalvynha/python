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
        "sticky top-0 z-20 flex items-center justify-between bg-white/80 " +
        "backdrop-blur px-4 " +
        (compact ? "py-2" : "py-3 sm:px-6")
      }
    >
      <Link href="/" className="flex items-center gap-2" aria-label="Home">
        <Image
          src="/logo.png"
          alt="Quality Learing Center"
          width={compact ? 120 : 170}
          height={compact ? 50 : 70}
          priority
          className="h-auto w-auto max-h-14"
        />
      </Link>

      <div className="flex items-center gap-2">
        {backTo && (
          <button
            type="button"
            onClick={() => router.push(backTo)}
            className="rounded-xl border-2 border-slate-200 bg-white px-4 py-2 text-slate-700 font-semibold hover:border-sky-400"
            aria-label={backLabel}
          >
            ← {backLabel}
          </button>
        )}
        {exitTo && (
          <Link
            href={exitTo}
            className="rounded-xl bg-rose-500 px-4 py-2 font-semibold text-white hover:bg-rose-600"
            aria-label={exitLabel}
          >
            {exitLabel}
          </Link>
        )}
      </div>
    </header>
  );
}
