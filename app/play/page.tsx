import { Suspense } from "react";
import { PlayClient } from "./PlayClient";

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-xl px-6 py-20 text-center">
          Loading…
        </main>
      }
    >
      <PlayClient />
    </Suspense>
  );
}
