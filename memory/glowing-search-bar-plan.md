# Animated Glowing Search Bar — Integration Plan

## Summary

Wrap the existing search `<input>` in a CSS-only container that animates a glowing border/box-shadow effect on focus. No JS, no new dependencies. ~20 lines of CSS keyframes + minimal Tailwind changes.

## 21st.dev Reference

The component by @minhxthanh lives at 21st.dev registry listing `minhxthanh/animated-glowing-search-bar`. The full source is gated behind `npx @21st-dev/cli add` which errored in this environment. However the visual effect is a well-known pattern: a pulsing colored glow (box-shadow/outline) on the search input when focused, using CSS `@keyframes`.

## Approach: Pure CSS Wrapper (rung 5 of ponytail ladder)

**Wrapping div** around the existing input, not replacing the input.

The parent `.flex-1.relative` div already wraps the input, icon, and clear button. We add a `group` class to it, and style the glow on `group-focus-within:` or `group-focus-visible:`.

### Key decisions

| Decision | Choice | Why |
|----------|--------|-----|
| CSS vs JS-driven | CSS `@keyframes` + `box-shadow` | Zero runtime cost, compositor-thread |
| New wrapper component | No | One CSS addition to existing file, no new abstraction |
| Animation trigger | `:focus-within` on parent div | Catches focus on input or clear button |
| RTL support | Unchanged — `start`/`end` classes already RTL-safe | No changes needed |
| Interaction with sort / dropdown | Unchanged — sort button is outside wrapper, suggestions dropdown inside | No effect |
| Performance | Single `box-shadow` animation on compositor | No layout thrash |

### CSS to add

A `@keyframes` animation that pulses the box-shadow glow:

```css
@keyframes search-glow {
  0%, 100% {
    box-shadow: 0 0 8px 2px color-mix(in srgb, var(--color-orange) 15%, transparent),
                0 0 20px 4px color-mix(in srgb, var(--color-orange) 8%, transparent);
  }
  50% {
    box-shadow: 0 0 12px 4px color-mix(in srgb, var(--color-orange) 25%, transparent),
                0 0 30px 8px color-mix(in srgb, var(--color-orange) 12%, transparent);
  }
}
```

### Tailwind changes to the existing input

Replace:
```
focus-visible:ring-4 focus-visible:ring-orange/20
```

With:
```
group-focus-within:ring-0 group-focus-within:animate-search-glow
```

And add `group` to the parent div.

### Where the CSS lives

Option A: Add `@keyframes` to the file's module CSS or the component's CSS-in-JS (Tailwind `@layer utilities` in `global.css`).

Option B: If the project uses a CSS modules file for this component, add it there.

Given this is a Next.js project — add the `@keyframes` to `app/globals.css` under `@layer utilities`:

```css
@layer utilities {
  @keyframes search-glow {
    0%, 100% {
      box-shadow: 0 0 8px 2px color-mix(in srgb, oklch(0.7 0.19 47) 15%, transparent),
                  0 0 20px 4px color-mix(in srgb, oklch(0.7 0.19 47) 8%, transparent);
    }
    50% {
      box-shadow: 0 0 12px 4px color-mix(in srgb, oklch(0.7 0.19 47) 25%, transparent),
                  0 0 30px 8px color-mix(in srgb, oklch(0.7 0.19 47) 12%, transparent);
    }
  }
}
```

Then in MenuToolbar.tsx: register the utility as a Tailwind animation in `tailwind.config` or use `animate-[search-glow_2s_ease-in-out_infinite]` for arbitrary animation support.

## Files to modify

1. `src/components/menu/MenuToolbar.tsx` — ~3 line changes (parent div gets `group`, input class tweaks)
2. `app/globals.css` or project's main CSS — add `@keyframes search-glow`
3. `tailwind.config.ts` — optionally register the animation keyframe if not using arbitrary values

## What's NOT needed

- New component file
- New dependency (no framer-motion, no react-spring)
- State changes
- JS-driven glow logic
- Any change to sort button or suggestion dropdown

## Minimal diff estimate

- **MenuToolbar.tsx**: change 2 classes on line 83, add `group` to line 74 = 3 edits
- **globals.css**: 14 lines of keyframes
- Total: ~17 lines net

## Verification

- Visual: input shows pulsing orange glow on focus, stops on blur
- RTL: layout unchanged
- Sort button: clickable and functional during glow
- Suggestions: dropdown opens on input, dismisses on blur
- Performance: no re-renders triggered by the animation
