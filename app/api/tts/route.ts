import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";

export const runtime = "nodejs";

/**
 * Generate (or serve cached) audio for a word or short sentence using
 * ElevenLabs TTS. Audio bytes are cached in Firestore at
 * `audioCache/{sha256(voiceId + text)}` as base64 so the same text only
 * costs one ElevenLabs call across all users.
 *
 * Returns: audio/mpeg body.
 * Query:   /api/tts?q=<text>
 * Auth:    requires a valid Firebase ID token (prevents quota abuse).
 */
const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel — clear, neutral American English
const MODEL_ID = "eleven_turbo_v2_5";

export async function GET(req: NextRequest) {
  try {
    await requireUser(req);
    const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
    if (!q || q.length > 200) {
      return NextResponse.json({ error: "bad_query" }, { status: 400 });
    }

    const cacheKey = createHash("sha256")
      .update(`${VOICE_ID}:${MODEL_ID}:${q}`)
      .digest("hex");

    const db = adminDb();
    const cacheRef = db.collection("audioCache").doc(cacheKey);

    const cached = await cacheRef.get();
    if (cached.exists) {
      const { b64 } = cached.data() as { b64: string };
      return audioResponse(Buffer.from(b64, "base64"));
    }

    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "tts_not_configured" },
        { status: 500 }
      );
    }

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": key,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: q,
          model_id: MODEL_ID,
          voice_settings: {
            stability: 0.55,
            similarity_boost: 0.8,
            style: 0.1,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return NextResponse.json(
        { error: "tts_error", status: res.status, detail: errText.slice(0, 200) },
        { status: 502 }
      );
    }

    const buf = Buffer.from(await res.arrayBuffer());
    await cacheRef.set({
      b64: buf.toString("base64"),
      text: q,
      voiceId: VOICE_ID,
      modelId: MODEL_ID,
      fetchedAt: Date.now(),
    });

    return audioResponse(buf);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    const status = msg.includes("bearer") ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

function audioResponse(buf: Buffer): Response {
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "audio/mpeg",
      // Browser-side cache; safe because the query string fully
      // determines the content.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
