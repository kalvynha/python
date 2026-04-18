import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-center">
      <h1 className="text-5xl font-bold tracking-tight text-slate-900">
        Starbright Learning
      </h1>
      <p className="mt-4 text-xl text-slate-600">
        Science-backed math and spelling practice for kids 6–10. Short,
        adaptive sessions. AI-tailored feedback for you and your child.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-4">
        <Link href="/profiles" className="btn-primary">
          I'm a kid
        </Link>
        <Link href="/dashboard" className="btn-ghost">
          Parent dashboard
        </Link>
      </div>
      <ul className="mx-auto mt-16 grid max-w-2xl gap-4 text-left text-slate-700 sm:grid-cols-2">
        <li className="rounded-2xl bg-white/70 p-5 shadow-sm">
          <strong>Spaced repetition</strong> — missed items come back at
          the right time to stick.
        </li>
        <li className="rounded-2xl bg-white/70 p-5 shadow-sm">
          <strong>Interleaved practice</strong> — mixing skills improves
          retention over blocking.
        </li>
        <li className="rounded-2xl bg-white/70 p-5 shadow-sm">
          <strong>Immediate feedback</strong> — kind, specific, and never
          shaming.
        </li>
        <li className="rounded-2xl bg-white/70 p-5 shadow-sm">
          <strong>Parent-set sessions</strong> — pick 5, 10, 15, or 20
          minutes. We handle the rest.
        </li>
      </ul>
    </main>
  );
}
