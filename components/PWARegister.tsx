"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker once, on the client, after the
 * first paint. No-op during SSR and in browsers without SW support.
 */
export function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Defer until the page is loaded to avoid competing with the
    // initial render.
    const handle = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    };
    if (document.readyState === "complete") handle();
    else window.addEventListener("load", handle, { once: true });
    return () => window.removeEventListener("load", handle);
  }, []);

  return null;
}
