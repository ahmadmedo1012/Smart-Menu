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

// ── Layer 1: Primitive Tokens (raw values) ──

export const primitives = {
  // Color - neutral ramp (derived from globals.css OKLCH values)
  gray: {
    50: 'oklch(0.98 0.004 70)',
    100: 'oklch(0.95 0.006 70)',
    200: 'oklch(0.90 0.008 70)',
    300: 'oklch(0.82 0.010 70)',
    400: 'oklch(0.70 0.012 70)',
    500: 'oklch(0.58 0.014 70)',
    600: 'oklch(0.46 0.013 70)',
    700: 'oklch(0.36 0.010 70)',
    800: 'oklch(0.26 0.008 70)',
    900: 'oklch(0.18 0.006 70)',
    950: 'oklch(0.12 0.004 70)',
  },

  // Color - accent ramp (orange brand color)
  accent: {
    50: 'oklch(0.97 0.03 45)',
    100: 'oklch(0.93 0.06 45)',
    200: 'oklch(0.86 0.10 45)',
    300: 'oklch(0.78 0.14 45)',
    400: 'oklch(0.68 0.18 45)',
    500: 'oklch(0.58 0.20 45)',
    600: 'oklch(0.48 0.19 45)',
    700: 'oklch(0.38 0.16 45)',
    800: 'oklch(0.28 0.12 45)',
    900: 'oklch(0.20 0.08 45)',
    950: 'oklch(0.13 0.05 45)',
  },

  // Color - semantic bases
  green: {
    400: 'oklch(0.72 0.18 145)',
    600: 'oklch(0.52 0.18 145)',
  },
  amber: {
    400: 'oklch(0.78 0.16 70)',
    600: 'oklch(0.58 0.16 70)',
  },
  red: {
    400: 'oklch(0.65 0.20 25)',
    600: 'oklch(0.48 0.20 25)',
  },
  blue: {
    400: 'oklch(0.66 0.16 250)',
    600: 'oklch(0.50 0.16 250)',
  },

  // Spacing - 8pt scale
  space: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem',   // 64px
    '4xl': '6rem',   // 96px
  },

  // Type - size scale
  text: {
    xs: '0.75rem',   // 12px
    sm: '0.875rem',  // 14px
    base: '1rem',    // 16px
    lg: '1.125rem',  // 18px
    xl: '1.25rem',   // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px
  },

  // Type - weight
  font: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Type - line-height
  leading: {
    none: 1,
    tight: 1.1,
    snug: 1.3,
    normal: 1.5,
    relaxed: 1.65,
  },

  // Type - letter-spacing
  tracking: {
    tight: '-0.03em',
    normal: '0',
    wide: '0.01em',
    wider: '0.05em',
  },

  // Radii
  radius: {
    none: '0',
    sm: '0.375rem',   // 6px
    md: '0.625rem',   // 10px
    lg: '1rem',       // 16px
    xl: '1.5rem',     // 24px
    full: '9999px',
  },

  // Shadows - layered ambient + direct
  shadow: {
    sm: '0 1px 2px oklch(0% 0 0 / 0.05)',
    md: '0 4px 6px oklch(0% 0 0 / 0.07), 0 1px 3px oklch(0% 0 0 / 0.06)',
    lg: '0 10px 15px oklch(0% 0 0 / 0.09), 0 4px 6px oklch(0% 0 0 / 0.05)',
    xl: '0 20px 25px oklch(0% 0 0 / 0.10), 0 8px 10px oklch(0% 0 0 / 0.04)',
  },

  // Motion - durations
  duration: {
    instant: '80ms',
    fast: '150ms',
    normal: '250ms',
    slow: '400ms',
  },

  // Motion - easings
  ease: {
    out: 'cubic-bezier(0.16, 1, 0.3, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  // Z-index - semantic layers
  zIndex: {
    base: 0,
    raised: 1,
    dropdown: 10,
    sticky: 20,
    'modal-backdrop': 30,
    modal: 40,
    toast: 50,
    tooltip: 60,
  },
} as const;

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

/**
 * Get the current theme ('light' or 'dark')
 */
export function getTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark'; // default
  return document.documentElement.classList.contains('light') ? 'light' : 'dark';
}

// Export all tokens as a single object for convenience
export const designTokens = {
  primitives,
  semantics,
  components,
  getToken,
  getTheme,
} as const;
