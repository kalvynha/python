"use client";

import { getFirebaseAuth } from "@/lib/firebase/client";

export async function authedFetch(url: string, init: RequestInit = {}) {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  const token = await user.getIdToken();
  return fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
      authorization: `Bearer ${token}`,
    },
  });
}
