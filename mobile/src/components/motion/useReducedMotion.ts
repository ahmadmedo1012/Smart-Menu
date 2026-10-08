import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * r126-M4 (A6 P1-5): the app had zero motion and zero reduced-motion
 * awareness. Every motion primitive in src/components/motion gates itself on
 * this hook: iOS Settings → Accessibility → Motion → Reduce Motion
 * (and the Android equivalent) swap scale/translation animations for
 * opacity-only feedback (or no animation at all for decorative motion),
 * matching the Madarek "respect prefers-reduced-motion" rule.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    // Initial read + live subscription (the setting can flip mid-session).
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => { if (mounted) setReduced(v); })
      .catch(() => { /* AccessibilityInfo can reject on some hosts — default off */ });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (v) => {
      if (mounted) setReduced(v);
    });
    return () => { mounted = false; sub.remove(); };
  }, []);

  return reduced;
}
