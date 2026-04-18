import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import textToSpeech from "@google-cloud/text-to-speech";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";

export const runtime = "nodejs";

/**
 * Generate (or serve cached) audio for a word or short sentence using
 * Google Cloud Text-to-Speech. Authenticates with the same service
 * account as firebase-admin (FIREBASE_SERVICE_ACCOUNT_B64).
 *
 * Requires on your GCP project:
 *   - Text-to-Speech API enabled
 *     (gcloud services enable texttospeech.googleapis.com)
 *   - The service account used for FIREBASE_SERVICE_ACCOUNT_B64 has
 *     the "Cloud Text-to-Speech API User" role (roles/cloudtts.user)
 *     or broader.
 *
 * Results are cached per-text in Firestore at audioCache/{hash}.
 * Response: audio/mpeg.
 * Auth: Firebase ID token in Authorization header (prevents quota abuse).
 */

const VOICE_NAME = "en-US-Neural2-H"; // Friendly female Neural2 voice
const SPEAKING_RATE = 0.9;
const PITCH = 0;

let _client: ReturnType<typeof makeClient> | null = null;
function makeClient() {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!b64) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_B64 not set");
  }
  const credentials = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  return new textToSpeech.TextToSpeechClient({
    credentials,
    projectId: credentials.project_id,
  });
}
function getClient() {
  if (!_client) _client = makeClient();
  return _client;
}

export async function GET(req: NextRequest) {
  try {
    await requireUser(req);
    const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
    if (!q || q.length > 200) {
      return NextResponse.json({ error: "bad_query" }, { status: 400 });
    }

    const cacheKey = createHash("sha256")
      .update(`${VOICE_NAME}:${SPEAKING_RATE}:${PITCH}:${q}`)
      .digest("hex");

    const db = adminDb();
    const cacheRef = db.collection("audioCache").doc(cacheKey);

    const cached = await cacheRef.get();
    if (cached.exists) {
      const { b64 } = cached.data() as { b64: string };
      return audioResponse(Buffer.from(b64, "base64"));
    }

    const client = getClient();
    const [resp] = await client.synthesizeSpeech({
      input: { text: q },
      voice: {
        languageCode: "en-US",
        name: VOICE_NAME,
      },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: SPEAKING_RATE,
        pitch: PITCH,
      },
    });

    if (!resp.audioContent) {
      return NextResponse.json(
        { error: "tts_empty_response" },
        { status: 502 }
      );
    }

    const buf = Buffer.isBuffer(resp.audioContent)
      ? resp.audioContent
      : Buffer.from(resp.audioContent);

    await cacheRef.set({
      b64: buf.toString("base64"),
      text: q,
      voiceName: VOICE_NAME,
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
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
