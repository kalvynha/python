import { Suspense } from "react";
import { BaselineClient } from "./BaselineClient";

export default function BaselinePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-xl px-6 py-20 text-center">
          Loading…
        </main>
      }
    >
      <BaselineClient />
    </Suspense>
  );
}
