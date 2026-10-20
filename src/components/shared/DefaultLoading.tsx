export function DefaultLoading() {
  return (
    // r119-S5-P2: role=status announces the loading state to screen readers
    // (spinners are invisible to AT otherwise).
    <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        {/* Spinner = live dot (pulse family — stays). W7-G (A2 audit): the
            label is TEXT, not a shape — the animate-breath opacity pulse was
            the second shape-loading language; the label now stays readable
            (labels never shimmer; shapes ride .skeleton). */}
        <div className="size-8 rounded-full border-2 border-orange/30 border-t-orange animate-spin" />
        <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>
      </div>
    </div>
  );
}
