# Quality Learing Center

A science-backed web app for kids 6–10 to practice math and spelling, with
AI-generated sessions and tailored feedback. Parents set session length and
get a dashboard of what each child is working on.

## What's in the box

- **Adaptive engine** — Leitner-box spaced repetition, interleaved math +
  spelling, weighted mix of review / current-level / stretch items.
- **AI-generated sessions** — Claude Haiku 4.5 composes each session from a
  curated item bank plus the child's due items.
- **AI feedback** — Claude Sonnet 4.6 writes one kid-facing and one
  parent-facing summary per session, naming specific skill patterns.
- **Kid-first UI** — big tap targets, on-screen numpad, Web Speech audio
  for spelling, Framer Motion celebrations, Lexend font.
- **Parent dashboard** — PIN gate, per-kid duration/mix settings, weekly
  accuracy chart, latest AI summary.
- **Firebase end-to-end** — Auth, Firestore, App Hosting (Next.js).

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS · Framer Motion ·
Recharts · Firebase Auth · Firestore · Firebase App Hosting ·
`@anthropic-ai/sdk` (Haiku 4.5 + Sonnet 4.6) · Zod · Vitest.

## Local setup

```bash
npm install
cp .env.example .env.local
# fill in ANTHROPIC_API_KEY, NEXT_PUBLIC_FIREBASE_*, FIREBASE_SERVICE_ACCOUNT_B64
npm run dev
```

To encode a service account JSON for local use:

```bash
base64 -w0 service-account.json
# paste into FIREBASE_SERVICE_ACCOUNT_B64
```

Seed the curated item bank (one-time):

```bash
npm run seed
```

Run tests:

```bash
npm test
```

## Deploy to Firebase App Hosting

1. Create a Firebase project and enable **Auth (Email/Password)**,
   **Firestore**, and **App Hosting**.
2. Generate a service account key, base64-encode it, and set it as a
   secret:
   ```bash
   firebase apphosting:secrets:set FIREBASE_SERVICE_ACCOUNT_B64
   firebase apphosting:secrets:set ANTHROPIC_API_KEY
   ```

   Spelling audio uses Google Cloud Text-to-Speech with the same
   service account. Enable the API and grant the role:

   ```bash
   gcloud services enable texttospeech.googleapis.com --project <projectId>
   gcloud projects add-iam-policy-binding <projectId> \
     --member="serviceAccount:<service-account-email>" \
     --role="roles/cloudtts.user"
   ```

   Neural2 voices include 1M free chars/month — the full ~420-word
   library fits easily, and per-text results are cached in Firestore's
   `audioCache` collection after the first request.
3. Fill the `NEXT_PUBLIC_FIREBASE_*` values in `apphosting.yaml` with your
   project's web app config (public by design).
4. Connect this repo to a Firebase App Hosting backend:
   ```bash
   firebase init apphosting
   firebase deploy --only apphosting
   ```
5. Deploy Firestore rules:
   ```bash
   firebase deploy --only firestore
   ```

## How the learning engine works

### Leitner SRS (`lib/srs/leitner.ts`)

Items live in one of five boxes; each box has a review interval (1d, 2d,
4d, 7d, 14d). Correct answers promote; wrong answers demote to box 1. An
item is "mastered" when it reaches box 4+ with a streak of 3 correct.

### Session composition (`lib/srs/selector.ts`)

Each session is a weighted mix:

- **~60% review** — items whose `dueAt` has passed, oldest first.
- **~25% current level** — items at the kid's current level (±1).
- **~15% stretch** — one to two levels harder.

Math and spelling are interleaved when the subject mix is balanced
(toggleable per kid).

### Session resolution (inventory-first, Claude-fallback)

After the selector picks items, `lib/srs/resolver.ts` turns each pick
into a concrete problem in this order:

1. **Procedural math** — calls `generateMathItems()` directly with a
   per-session seed. Fresh math every session, zero AI cost.
2. **Curated spelling inventory** — reads the pre-seeded `items/{id}`
   doc; falls back to `generateSpellingItems()` from the curated word
   bank if the inventory entry is incomplete.
3. **Claude fallback** — only invoked when fewer than `FALLBACK_THRESHOLD`
   problems resolved locally, or when a required skill tag is missing
   from both inventory and the seed banks. In practice this almost
   never fires.

Each session's Firestore doc records a `generationSource: { procedural,
inventory, claude }` count for telemetry.

### AI calls

- `generateFeedback` (Sonnet 4.6) summarizes the session's attempts into
  a short kid-facing message and a richer parent report, naming the 1-4
  focus skills for next time. **Called every session.**
- `generateSession` (Haiku 4.5) is kept as a fallback for the resolver.
  **Called only when the inventory can't satisfy the selector's picks.**

## Data model

Firestore collections, parent-owned subtree enforced by security rules:

```
households/{hid}              parentUid, createdAt
  kids/{kidId}                displayName, avatar, age, subjectMix,
                              sessionDurationS, interleave
    skillLevels/{skillTag}    level, lastAssessedAt
    reviewQueue/{itemId}      box, dueAt, streak
    sessions/{sid}            startedAt, endedAt, durationTargetS, ...
      attempts/{aid}          itemId, prompt, expected, given,
                              correct, timeMs, hintUsed, at
      feedback/summary        kidSummary, parentSummary, focusSkills
items/{itemId}                curated math + spelling bank (shared)
```

## Verification checklist

- `npm test` — unit tests for Leitner scheduling + session selector.
- `npm run typecheck` — clean.
- Manual path: sign up → add kid → run session → check feedback renders.
- Cost check: Anthropic dashboard prompt-cache hit rate >70% on repeat
  generation.
- Accessibility: axe-core pass + keyboard-only run-through.
