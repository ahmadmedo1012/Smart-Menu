/**
 * Smart Menu Design Tokens - Centralized Token Spine
 *
 * This file defines the 3-layer token system (primitive → semantic → component)
 * following the ui-craft tokens.md contract.
 *
 * These tokens are synced with globals.css and should be used programmatically
 * when CSS custom properties aren't accessible (e.g., in JS logic, canvas drawing,
 * or chart libraries).
 */

// ── Layer 2: Semantic Tokens (contextual meaning) ──

export const semantics = {
  // Surface stack - 5 levels of elevation
  surface: {
    canvas: 'var(--gray-50)',
    raised: 'var(--gray-100)',
    overlay: '#fff',
    sunken: 'var(--gray-200)',
    inverse: 'var(--gray-900)',
  },

  // Text
  text: {
    primary: 'var(--gray-900)',
    secondary: 'var(--gray-600)',
    tertiary: 'var(--gray-400)',
    'on-accent': '#fff',
    'on-inverse': 'var(--gray-50)',
    link: 'var(--accent-600)',
    success: 'var(--green-600)',
    warning: 'var(--amber-600)',
    error: 'var(--red-600)',
  },

  // Border
  border: {
    subtle: 'oklch(0% 0 0 / 0.06)',
    default: 'oklch(0% 0 0 / 0.12)',
    strong: 'oklch(0% 0 0 / 0.24)',
    focus: 'var(--accent-500)',
    error: 'var(--red-400)',
  },

  // Accent
  accent: {
    bg: 'var(--accent-500)',
    'bg-hover': 'var(--accent-600)',
    'bg-active': 'var(--accent-700)',
    text: '#fff',
    border: 'var(--accent-400)',
  },

  // Status - bg / text / border per state
  status: {
    success: {
      bg: 'oklch(96% 0.04 145)',
      text: 'var(--green-600)',
      border: 'var(--green-400)',
    },
    warning: {
      bg: 'oklch(97% 0.04 70)',
      text: 'var(--amber-600)',
      border: 'var(--amber-400)',
    },
    error: {
      bg: 'oklch(97% 0.04 25)',
      text: 'var(--red-600)',
      border: 'var(--red-400)',
    },
    info: {
      bg: 'oklch(96% 0.04 250)',
      text: 'var(--blue-600)',
      border: 'var(--blue-400)',
    },
  },
} as const;

// ── Layer 3: Component Tokens (specific usage) ──

export const components = {
  // Button tokens
  button: {
    primary: {
      bg: 'var(--accent-bg)',
      'bg-hover': 'var(--accent-bg-hover)',
      'bg-active': 'var(--accent-bg-active)',
      text: 'var(--accent-text)',
      'border-radius': 'var(--radius-md)',
      'padding-x': 'var(--space-md)',
      'padding-y': 'var(--space-sm)',
    },
  },

  // Input tokens
  input: {
    bg: 'var(--surface-canvas)',
    border: 'var(--border-default)',
    'border-focus': 'var(--border-focus)',
    'border-error': 'var(--border-error)',
    text: 'var(--text-primary)',
    placeholder: 'var(--text-tertiary)',
    'border-radius': 'var(--radius-md)',
  },
} as const;

// ── Token getters for runtime access ──

/**
 * Get a CSS custom property value from the DOM
 * Falls back to a default if the property doesn't exist
 */
export function getToken(tokenName: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const style = getComputedStyle(document.documentElement);
  return style.getPropertyValue(tokenName).trim() || fallback;
}


// Export all tokens as a single object for convenience

// round85-C7: dead exports removed (primitives / getTheme / designTokens
// had zero importers — semantics, components, and getToken remain in use).
