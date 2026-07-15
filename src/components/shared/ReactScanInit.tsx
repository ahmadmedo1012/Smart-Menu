"use client";

import { useEffect } from "react";

export function ReactScanInit() {
  useEffect(() => {
    import("react-scan").then(({ scan }) =>
      scan({ enabled: process.env.NODE_ENV === "development" }),
    );
  }, []);
  return null;
}
