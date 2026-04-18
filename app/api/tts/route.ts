import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import textToSpeech from "@google-cloud/text-to-speech";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";

export const runtime = "nodejs";

/**
 * Google Cloud Text-to-Speech for spelling + math prompts.
 *
 * Two input modes:
 *   GET /api/tts?q=<text>   - plain text
 *   GET /api/tts?s=<ssml>   - SSML for fine-grained prosody
 *
 * The SSML path lets the SessionGreeting render a Miss-Rachel-style
 * delivery ("Hi, Ada! <break/> Let's GO!") without hard-coding markup
 * on the server. Both paths share the same Firestore audio cache at
 * audioCache/{sha256(voiceId + params + body)}.
 *
 * Authenticates with FIREBASE_SERVICE_ACCOUNT_B64; the GCP project
 * must have Text-to-Speech API enabled and the service account must
 * carry roles/serviceusage.serviceUsageConsumer (or Editor).
 */

const VOICE_NAME = "en-US-Neural2-F"; // warm, friendly female — Miss-Rachel-ish
const SPEAKING_RATE = 0.95;
const PITCH = 2; // +2 semitones — a touch brighter / more upbeat

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
    const ssml = req.nextUrl.searchParams.get("s");
    const q = req.nextUrl.searchParams.get("q");
    const body = (ssml ?? q ?? "").trim();
    if (!body || body.length > 800) {
      return NextResponse.json({ error: "bad_query" }, { status: 400 });
    }

    const mode = ssml ? "ssml" : "text";
    const cacheKey = createHash("sha256")
      .update(`${VOICE_NAME}:${SPEAKING_RATE}:${PITCH}:${mode}:${body}`)
      .digest("hex");

    const db = adminDb();
    const cacheRef = db.collection("audioCache").doc(cacheKey);

    const cached = await cacheRef.get();
    if (cached.exists) {
      const { b64: cachedB64 } = cached.data() as { b64: string };
      return audioResponse(Buffer.from(cachedB64, "base64"));
    }

    const client = getClient();
    const [resp] = await client.synthesizeSpeech({
      input: ssml ? { ssml } : { text: q ?? "" },
      voice: { languageCode: "en-US", name: VOICE_NAME },
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
      mode,
      body: body.slice(0, 240),
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
