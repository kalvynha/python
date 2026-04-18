import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";

export const runtime = "nodejs";

/**
 * Look up a kid-friendly illustration for a spelling word.
 *
 * Query: /api/images/lookup?q=cake
 * Response: { url: string | null, source: "cache" | "pixabay" | "none" }
 *
 * Results are cached in Firestore at `imageCache/{word}` so we only call
 * Pixabay once per word across the whole app.
 */
export async function GET(req: NextRequest) {
  try {
    await requireUser(req);
    const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
    if (!q || q.length > 40 || !/^[a-z\-' ]+$/.test(q)) {
      return NextResponse.json({ error: "bad_query" }, { status: 400 });
    }

    const db = adminDb();
    const cacheRef = db.collection("imageCache").doc(q);
    const cached = await cacheRef.get();
    if (cached.exists) {
      const { url } = cached.data() as { url: string | null };
      return NextResponse.json({ url, source: "cache" });
    }

    const key = process.env.PIXABAY_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "pixabay_not_configured" },
        { status: 500 }
      );
    }

    const url = new URL("https://pixabay.com/api/");
    url.searchParams.set("key", key);
    url.searchParams.set("q", q);
    url.searchParams.set("image_type", "illustration");
    url.searchParams.set("safesearch", "true");
    url.searchParams.set("per_page", "3");
    url.searchParams.set("orientation", "horizontal");

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        { error: "pixabay_error", status: res.status },
        { status: 502 }
      );
    }
    const data = (await res.json()) as {
      hits: Array<{ previewURL: string; webformatURL: string }>;
    };
    const pick = data.hits[0]?.webformatURL ?? data.hits[0]?.previewURL ?? null;

    // Cache even a null result — saves repeated misses.
    await cacheRef.set({
      url: pick,
      fetchedAt: Date.now(),
      word: q,
    });

    return NextResponse.json({
      url: pick,
      source: pick ? "pixabay" : "none",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    const status = msg.includes("bearer") ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
