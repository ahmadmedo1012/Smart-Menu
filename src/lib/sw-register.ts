"use client";

import { useEffect } from "react";

export function useServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration;

    (async () => {
      try {
        registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        // Check for updates on page load
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;

          installing.addEventListener("statechange", () => {
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // New version available — dispatch event for app UI to handle
              window.dispatchEvent(
                new CustomEvent("sw-update", {
                  detail: { registration },
                }),
              );
            }
          });
        });
      } catch (err) {
        console.error("SW registration failed:", err);
      }
    })();

    return () => {
      if (registration) {
        registration.unregister().catch(() => {});
      }
    };
  }, []);
}
