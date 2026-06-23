"use client";

import { useEffect } from "react";

/** Registers the service worker (installable PWA + offline). `base` matches the
 *  app's basePath ("" locally, "/boardmarkie" on Pages) so the SW scope is right. */
export function RegisterSW({ base }: { base: string }) {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` }).catch(() => {
        /* offline support is best-effort */
      });
    };
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, [base]);

  return null;
}
