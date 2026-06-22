"use client";

import { useServiceWorker } from "@/lib/sw-register";

export default function ServiceWorkerInit() {
  useServiceWorker();
  return null;
}
