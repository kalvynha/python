import { Suspense } from "react";
import { RewardsClient } from "./RewardsClient";

export default function RewardsPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-xl px-6 py-20 text-center">
          Loading…
        </main>
      }
    >
      <RewardsClient />
    </Suspense>
  );
}
