---
name: PlanPOS
url: https://planpos.com/
colors:
  primary: '#f66d0f'
  primary-hover: '#e05f0a' # inferred from screenshot, slightly darker orange
  background: '#ffffff'
  surface-dark: '#111013'
  text-primary: '#1f2124'
  text-inverse: '#ffffff'
  text-muted: '#8A8A93'
  border: 'color-mix(in srgb, #8A8A93 15%, transparent)'
  focus-ring: 'rgba(0, 0, 0, 0.6)' # from pseudoStates.focus box-shadow
  dark-text: '#f9f9f9'
  dark-surface: '#111013'
  dark-text-muted: '#c0c0c0' # inferred from cssVariables.--clb-color-neutral in dark-scheme
  dark-border: '#606060' # inferred from cssVariables.--clb-color-grey-light in dark-scheme
typography:
  display:
    family: 'AloaaxB'
    size: 92px
    weight: 500
    line-height: 1.2
  heading:
    family: 'AloaaxB'
    size: 48px
    weight: 500
    line-height: 1.2
  body:
    family: 'Aloaax'
    size: 16px
    weight: 500
    line-height: 1.5
  small:
    family: 'Aloaax'
    size: 14px
    weight: 500
    line-height: 1.5
spacing:
  base: 4px
  scale: [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 80]
radius:
  sm: 2px
  md: 6px
  lg: 12px
  xl: 14px
  full: 50px
elevation:
  card: 'rgba(0, 0, 0, 0.14) 0px 6px 8px 2px'
  interactive: 'rgba(255, 255, 255, 0.05) -3px 0px 6px 0px'
  inset: 'rgba(255, 255, 255, 0.05) 0px 0px 0px 2px inset'
components:
  button-primary:
    bg: '{colors.primary}'
    text: '{colors.text-inverse}'
    radius: '{radius.sm}'
    padding: '16px 20px'
  card:
    bg: '{colors.surface-dark}'
    radius: '{radius.md}'
    shadow: '{elevation.card}'
motion:
  duration-fast: '0.2s'
  duration-base: '0.4s'
  easing-standard: 'ease-in-out' # inferred from common practice
layout:
  max-width: 1220px
  gutter: 20px
  breakpoints:
    mobile: 767px
    tablet: 1180px
    desktop-small: 769px
    desktop-large: 1181px
---

# Design System Inspired by PlanPOS

## 1. Visual Theme & Atmosphere
PlanPOS employs a bold, digital-first aesthetic, primarily driven by a striking `#f66d0f` orange accent against a dominant `#111013` dark background. The design leverages modern sans-serif typography, with `AloaaxB` for impactful headlines (e.g., 92px Display text) and `Aloaax` for body content, ensuring clear readability. Visual interest is added through stylized 3D illustrations, mobile device mockups, and subtle Lottie animations that enhance interactivity and engagement.

The brand's identity is reinforced by generous whitespace, particularly 80px vertical section padding, which creates a premium and focused presentation. A signature visual element is the dynamic orange gradient blob in the hero section, anchoring the brand's energetic and innovative approach. Interactive elements, such as buttons and links, utilize the primary orange, providing clear calls to action and a consistent brand experience with quick `0.2s` transitions.

**Key Characteristics**
- **Primary Orange**: `#f66d0f` for CTAs and highlights.
- **Dark Background**: Dominant `#111013` for main sections.
- **Bold Typography**: `AloaaxB` for headlines up to 92px.
- **Stylized Imagery**: 3D illustrations and mobile mockups.
- **Generous Whitespace**: 80px vertical padding for clarity.
- **Subtle Animation**: Lottie animations and `0.2s` transitions for interactions.

## 2. Color Palette & Roles
PlanPOS utilizes a focused color palette to establish clear visual hierarchy and brand identity.

- **Primary**: `#f66d0f` (Orange) — The brand's signature color, used for primary calls to action, interactive elements, and key informational highlights.
- **Primary Hover**: `#e05f0a` (Darker Orange) — A slightly darker shade of the primary orange, used to indicate hover states on interactive elements like buttons.
- **Background**: `#ffffff` (White) — Used for light-themed sections, form backgrounds, and areas requiring high contrast with dark text.
- **Surface Dark**: `#111013` (Near Black) — The predominant background color for most content sections, providing a sleek, modern canvas for text and graphics.
- **Text Primary**: `#1f2124` (Dark Grey) — Standard body text color used on light backgrounds, ensuring high readability.
- **Text Inverse**: `#ffffff` (White) — Main text color used on dark backgrounds and primary buttons, offering strong contrast.
- **Text Muted**: `#8A8A93` (Grey) — Used for secondary information, subtle hints, placeholders, and less prominent textual elements.
- **Border**: `color-mix(in srgb, #8A8A93 15%, transparent)` (Light Grey Transparent) — Subtle borders for inputs, dividers, and structural elements on light backgrounds.
- **Focus Ring**: `rgba(0, 0, 0, 0.6)` (Black Transparent) — Applied as a box-shadow for interactive element focus states, ensuring accessibility.
- **Dark Text**: `#f9f9f9` (Off-White) — Primary text color when displayed on dark surfaces in a potential dark mode context.
- **Dark Surface**: `#111013` (Near Black) — The base background color for dark mode interfaces.
- **Dark Text Muted**: `#c0c0c0` (Light Grey, inferred from screenshot) — Muted text color for secondary information within dark mode contexts.
- **Dark Border**: `#606060` (Medium Grey, inferred from screenshot) — Border color for elements within dark mode.

## 3. Typography Rules
PlanPOS employs a distinct typographic system with a strong sans-serif presence, prioritizing clarity and impact.

- **Font Family**: 'AloaaxB', 'Aloaax', sans-serif · monospace fallback for code.
- **Hierarchy**:
  - **Display**: 'AloaaxB' `92px` `500` · line-height `1.2` · tracking `none` · Used for hero headlines.
  - **H1**: 'AloaaxB' `48px` `500` · line-height `1.2` · tracking `none` · Major section titles.
  - **H2**: 'AloaaxB' `33px` `500` · line-height `1.2` · tracking `none` · Sub-section headings.
  - **H3**: 'AloaaxB' `29px` `500` · line-height `1.2` · tracking `none` · Feature titles.
  - **H4**: 'AloaaxB' `25px` `500` · line-height `1.2` · tracking `none` · Smaller feature or card titles (inferred from `sizes`).
  - **Body**: 'Aloaax' `16px` `500` · line-height `1.5` · tracking `none` · Standard paragraph text.
  - **Small**: 'Aloaax' `14px` `500` · line-height `1.5` · tracking `none` · Secondary information or descriptions.
  - **Caption**: 'Aloaax' `13px` `500` · line-height `1.5` · tracking `none` · Fine print, footnotes, or metadata.
  - **Code/Mono**: `monospace` `14px` `400` · line-height `1.5` · tracking `none` · For code snippets or technical text (inferred).
- **Principles**:
  - Headlines use the bold 'AloaaxB' with ample size and tight line-height to create visual impact.
  - Body text maintains high readability with 'Aloaax' at `16px` and a comfortable `1.5` line-height.
  - A consistent `500` font-weight is applied across most text roles, contributing to a unified visual tone.
  - Typography is primarily set against dark backgrounds, leveraging `colors.text-inverse` for optimal contrast.
  - The type scale is designed to establish a clear hierarchy, guiding the user through content with distinct visual breaks.

## 4. Component Stylings

### Buttons

#### Primary Button
The primary button features a solid orange background with inverse white text, indicating key actions. On hover, the background darkens slightly, and when active, a subtle focus ring appears. Disabled states reduce opacity.

```css
.button-primary {
  background-color: var(--color-primary, #f66d0f);
  color: var(--color-text-inverse, #ffffff);
  font-family: 'AloaaxB', sans-serif;
  font-size: 15.58px; /* Extracted from button with text "إنشى قائمتك مجانا" */
  font-weight: 700;
  padding: 16px 20px; /* Extracted from button with text "إنشى قائمتك مجانا" */
  border: none;
  border-radius: var(--radius-sm, 5.6px); /* Adjusted from 5.6px to match radius.sm */
  cursor: pointer;
  transition: background-color var(--motion-duration-fast, 0.2s) var(--motion-easing-standard, ease-in-out),
              box-shadow var(--motion-duration-fast, 0.2s) var(--motion-easing-standard, ease-in-out);
}

.button-primary:hover {
  background-color: var(--color-primary-hover, #e05f0a);
}

.button-primary:active {
  background-color: var(--color-primary-hover, #e05f0a);
  box-shadow: 0 0 0 5px rgba(138, 138, 147, 0.15); /* Inferred from pseudoStates.active for buttons */
}

.button-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

#### Secondary Button
The secondary button, exemplified by the "تسجيل الدخول" (Login) button, has a transparent background with a white border and inverse white text. On hover, it gains a subtle white background fill.

```css
.button-secondary {
  background-color: transparent;
  color: var(--color-text-inverse, #ffffff);
  font-family: 'AloaaxB', sans-serif;
  font-size: 14.76px; /* Extracted from button with text "تسجيل الدخول" */
  font-weight: 700;
  padding: 16px 16px; /* Extracted from button with text "تسجيل الدخول" */
  border: 1px solid var(--color-text-inverse, #ffffff); /* Inferred from screenshot */
  border-radius: var(--radius-sm, 5.6px); /* Adjusted from 5.6px to match radius.sm */
  cursor: pointer;
  transition: background-color var(--motion-duration-fast, 0.2s) var(--motion-easing-standard, ease-in-out),
              border-color var(--motion-duration-fast, 0.2s) var(--motion-easing-standard, ease-in-out);
}

.button-secondary:hover {
  background-color: rgba(255, 255, 255, 0.1); /* Inferred from screenshot */
  border-color: var(--color-text-inverse, #ffffff);
}

.button-secondary:active {
  background-color: rgba(255, 255, 255, 0.15); /* Inferred from screenshot */
  box-shadow: 0 0 0 5px rgba(138, 138, 147, 0.15); /* Inferred from pseudoStates.active for buttons */
}

.button-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

#### Ghost Button
Ghost buttons are text-only, using the primary orange color for their text. They are typically used for less prominent actions or within navigation.

```css
.button-ghost {
  background-color: transparent;
  color: var(--color-primary, #f66d0f);
  font-family: 'AloaaxB', sans-serif;
  font-size: 15.58px; /* Inferred from Primary button size */
  font-weight: 700;
  padding: 8px 12px; /* Inferred from screenshot */
  border: none;
  border-radius: var(--radius-sm, 5.6px);
  cursor: pointer;
  transition: color var(--motion-duration-fast, 0.2s) var(--motion-easing-standard, ease-in-out);
}

.button-ghost:hover {
  color: var(--color-primary-hover, #e05f0a);
}

.button-ghost:active {
  color: var(--color-primary-hover, #e05f0a);
  box-shadow: 0 0 0 5px rgba(138, 138, 147, 0.15); /* Inferred from pseudoStates.active for buttons */
}

.button-ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Cards & Containers

#### Standard Card
Cards feature a dark background, rounded corners, and a subtle shadow, providing visual separation for content blocks. On hover, the background subtly changes to indicate interactivity.

```css
.card {
  background-color: var(--color-surface-dark, #111013);
  color: var(--color-text-inverse, #ffffff);
  padding: 32px; /* Inferred from spacing scale */
  border-radius: var(--radius-md, 6px);
  box-shadow: var(--elevation-card, rgba(0, 0, 0, 0.14) 0px 6px 8px 2px);
  transition: background-color var(--motion-duration-base, 0.4s) var(--motion-easing-standard, ease-in-out);
}

.card:hover {
  background-color: var(--color-surface-dark, #111013); /* pseudoStates.hover suggests no change for .service-table:hover, using base */
  box-shadow: var(--elevation-card, rgba(0, 0, 0, 0.14) 0px 6px 8px 2px); /* No shadow change observed on hover */
}
```

### Inputs & Forms

#### Text Input
Text inputs are designed with a dark background, white text, and a subtle border. The focus state highlights the input with a clear outline.

```css
.input-text {
  background-color: var(--color-surface-dark, #111013);
  color: var(--color-text-inverse, #ffffff);
  font-family: 'Aloaax', sans-serif;
  font-size: 16px;
  font-weight: 500;
  padding: 12px 16px;
  border: 1px solid var(--color-border, color-mix(in srgb, #8A8A93 15%, transparent));
  border-radius: var(--radius-sm, 2px);
  transition: border-color var(--motion-duration-fast, 0.2s) var(--motion-easing-standard, ease-in-out),
              box-shadow var(--motion-duration-fast, 0.2s) var(--motion-easing-standard, ease-in-out);
}

.input-text:focus {
  border-color: var(--color-primary, #f66d0f); /* Inferred from screenshot */
  outline: none;
  box-shadow: 0 0 0 2px var(--color-focus-ring, rgba(0, 0, 0, 0.6)); /* Inferred from pseudoStates.focus */
}

.input-text:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: rgba(17, 16, 19, 0.5); /* Inferred from screenshot */
}
```

#### Form Label
Form labels use inverse white text to stand out against dark backgrounds.

```css
.form-label {
  color: var(--color-text-inverse, #ffffff);
  font-family: 'Aloaax', sans-serif;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px; /* Inferred from spacing scale */
}
```

#### Checkbox/Radio
Custom-styled checkboxes and radio buttons use the primary orange color when checked.

```css
.checkbox, .radio {
  appearance: none;
  width: 20px; /* Inferred from screenshot */
  height: 20px; /* Inferred from screenshot */
  border: 1px solid var(--color-border, color-mix(in srgb, #8A8A93 15%, transparent));
  border-radius: var(--radius-sm, 2px); /* For checkbox */
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background-color var(--motion-duration-fast, 0.2s) var(--motion-easing-standard, ease-in-out),
              border-color var(--motion-duration-fast, 0.2s) var(--motion-easing-standard, ease-in-out);
}

.radio {
  border-radius: var(--radius-full, 50px); /* For radio */
}

.checkbox:checked, .radio:checked {
  background-color: var(--color-primary, #f66d0f);
  border-color: var(--color-primary, #f66d0f);
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3e%3cpath fill='none' stroke='%23f' stroke-width='3' d='M6 10l3 3l6-6'/%3e%3c/svg%3e"); /* Extracted from pseudoStates.checked */
  background-size: 100% 100%;
  background-position: center;
  background-repeat: no-repeat;
}

.radio:checked {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'%3e%3ccircle r='2' fill='%23fff'/%3e%3c/svg%3e"); /* Extracted from pseudoStates.checked */
}

.checkbox:disabled, .radio:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Navigation

#### Top Navigation Bar
The top navigation bar features a dark background with white navigation links, providing a clean and accessible header.

```css
.nav-bar {
  background-color: var(--color-surface-dark, #111013);
  color: var(--color-text-inverse, #ffffff);
  padding: 20px 40px; /* Inferred from spacing scale */
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 12vh; /* From cssVariables.--clb-header-height */
  border-bottom: 1px solid var(--color-border, color-mix(in srgb, #8A8A93 15%, transparent)); /* Inferred from screenshot */
}
```

#### Navigation Link
Navigation links are white text on a dark background. On hover, their opacity subtly decreases. An active state is indicated by the primary orange color.

```css
.nav-link {
  color: var(--color-text-inverse, #ffffff);
  font-family: 'Aloaax', sans-serif;
  font-size: 16px;
  font-weight: 500;
  text-decoration: none;
  padding: 8px 16px; /* Inferred from spacing scale */
  transition: opacity var(--motion-duration-fast, 0.2s) var(--motion-easing-standard, ease-in-out),
              color var(--motion-duration-fast, 0.2s) var(--motion-easing-standard, ease-in-out);
}

.nav-link:hover {
  opacity: 0.65; /* Extracted from pseudoStates.hover for .branding */
}

.nav-link.active,
.nav-link[aria-current="page"] {
  color: var(--color-primary, #f66d0f); /* Inferred from screenshot */
  text-decoration: underline; /* Inferred from screenshot */
  text-decoration-color: var(--color-primary, #f66d0f);
  text-underline-offset: 4px; /* Inferred from screenshot */
}
```

#### Dropdown Menu
Dropdown menus appear on a dark background with white text links, often with a subtle shadow for elevation.

```css
.dropdown-menu {
  background-color: var(--color-surface-dark, #111013);
  color: var(--color-text-inverse, #ffffff);
  padding: 8px 0; /* Inferred from spacing scale */
  border-radius: var(--radius-sm, 2px);
  box-shadow: rgba(0, 0, 0, 0.3) 0px 4px 12px; /* Inferred from screenshot */
  min-width: 180px; /* Inferred from screenshot */
  z-index: 10; /* Extracted from elevation.zIndexValues */
  display: none; /* Hidden by default */
  position: absolute;
}

.dropdown-menu.open {
  display: block;
}

.dropdown-menu-item {
  color: var(--color-text-inverse, #ffffff);
  font-family: 'Aloaax', sans-serif;
  font-size: 16px;
  font-weight: 500;
  padding: 10px 16px; /* Inferred from spacing scale */
  text-decoration: none;
  display: block;
  transition: background-color var(--motion-duration-fast, 0.2s) var(--motion-easing-standard, ease-in-out);
}

.dropdown-menu-item:hover {
  background-color: rgba(255, 255, 255, 0.08); /* Inferred from screenshot */
}
```

### Links

#### Standard Link
Standard links are styled with the brand's primary orange color. On hover, they subtly darken.

```css
.link-standard {
  color: var(--color-primary, #f66d0f);
  text-decoration: none;
  font-family: 'Aloaax', sans-serif;
  font-size: 16px;
  font-weight: 500;
  transition: color var(--motion-duration-fast, 0.2s) var(--motion-easing-standard, ease-in-out);
}

.link-standard:hover {
  color: var(--color-primary-hover, #e05f0a);
  text-decoration: underline; /* Inferred from screenshot */
}

.link-standard:visited {
  color: var(--color-primary, #f66d0f); /* No change observed */
}
```

#### Secondary Link
Secondary links, often found in footers or less prominent areas, use white text on dark backgrounds. They show a slight opacity change on hover.

```css
.link-secondary {
  color: var(--color-text-inverse, #ffffff);
  text-decoration: none;
  font-family: 'Aloaax', sans-serif;
  font-size: 14px;
  font-weight: 500;
  transition: opacity var(--motion-duration-fast, 0.2s) var(--motion-easing-standard, ease-in-out);
}

.link-secondary:hover {
  opacity: 0.8; /* Inferred from screenshot */
}

.link-secondary:visited {
  color: var(--color-text-inverse, #ffffff); /* No change observed */
}
```

### Badges
(none observed in source)

## 5. Layout Principles
PlanPOS utilizes a structured layout system with generous spacing and defined container widths to ensure content clarity and visual appeal.

- **Spacing System**: The base spacing unit is `4px`, building a comprehensive scale for consistent element separation.
  - Base `4px` → `[0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 80]`
  - Usage Context:
    - `4px`: Smallest element gaps, icon-text spacing.
    - `8px`: Inline element spacing, small vertical gaps.
    - `12px`: Padding for smaller buttons, form field vertical spacing.
    - `16px`: Standard padding for inputs, horizontal spacing between text blocks.
    - `20px`: Gutter between grid columns, button horizontal padding.
    - `24px`: Vertical spacing between list items, card content padding.
    - `32px`: Card padding, larger component separation.
    - `40px`: Section sub-headings, larger vertical gaps.
    - `48px`: Major content block separation, hero element spacing.
    - `80px`: Large section padding, hero section top/bottom margins.

- **Grid & Container**:
  - Max Width: `1220px` (from `--clb-container-width-laptop-small`)
  - Columns: `12` (inferred from screenshot)
  - Gutter: `20px` (from `--column-gap` in `.e-con`)
  - Section Padding: `80px` vertical, `40px` horizontal (inferred from screenshot and spacing scale)

- **Whitespace Philosophy**: PlanPOS employs ample whitespace to create a sense of openness and focus, particularly around large typographic elements and content blocks. This generous use of space, especially the `80px` section padding, enhances readability and gives elements room to breathe, contributing to a premium and uncluttered user experience.

- **Border Radius Scale**:
  - `sm`: `2px` — Minimal rounding for inputs and subtle elements.
  - `md`: `6px` — Standard rounding for cards and buttons.
  - `lg`: `12px` — More pronounced rounding for larger containers or special elements.
  - `xl`: `14px` — Larger radius for distinct design elements.
  - `full`: `50px` — Used for perfectly circular elements like avatars or icons.

## 6. Depth & Elevation
PlanPOS defines a clear elevation hierarchy using shadows and z-index values to guide user attention and indicate interactive layers.

- **Base (z-0)**: `none` — Default stacking for static content and backgrounds.
- **Element (z-1)**: `rgba(255, 255, 255, 0.05) -3px 0px 6px 0px` — Used for subtle interactive elements or minor hover states.
- **Card (z-2)**: `rgba(0, 0, 0, 0.14) 0px 6px 8px 2px` — Applied to standard cards and elevated content blocks, providing a clear lift from the background.
- **Dropdown (z-10)**: `rgba(0, 0, 0, 0.3) 0px 4px 12px` (inferred from screenshot) — For navigation dropdowns, tooltips, and contextual menus.
- **Overlay (z-11)**: `rgba(0, 0, 0, 0.4) 0px 8px 16px` (inferred from screenshot) — Used for temporary panels, sidebars, or full-width navigation overlays.
- **Modal (z-50)**: `rgba(0, 0, 0, 0.5) 0px 10px 20px` (inferred from screenshot) — Reserved for primary modal dialogs, full-screen alerts, and critical user interactions.

**Shadow Philosophy**: Shadows are used sparingly but effectively to create a sense of depth and hierarchy on the dark interface. Subtle, diffused shadows are preferred for cards and interactive elements, while more pronounced shadows are reserved for transient layers like dropdowns and modals to clearly separate them from underlying content. The `rgba(255, 255, 255, 0.05)` inset shadow is used for subtle internal detailing.

## 7. Do's and Don'ts

### Do's
- **Do** use `AloaaxB` `92px` `500` for hero section display text to ensure maximum impact.
- **Do** maintain a minimum `80px` vertical spacing between major content sections.
- **Do** use `colors.primary` (`#f66d0f`) for all primary calls to action, such as the Primary Button.
- **Do** use `colors.text-inverse` (`#ffffff`) for body text on `colors.surface-dark` (`#111013`); measured ratio 18.96 passes AAA.
- **Do** apply `colors.primary` (`#f66d0f`) for links and icons on `colors.surface-dark` (`#111013`); measured ratio 6.42 passes AA.
- **Do** use `colors.text-muted` (`#8A8A93`) for secondary information, ensuring it's legible on `colors.surface-dark`.
- **Do** apply `var(--radius-md, 6px)` to all standard cards and buttons for consistent visual softness.
- **Do** ensure interactive elements like inputs have a clear `2px` `rgba(0,0,0,0.6)` box-shadow focus ring.
- **Do** use `16px` `Aloaax` `500` for all standard body text for consistent readability.
- **Do** use `var(--motion-duration-fast, 0.2s)` for all hover and active state transitions.

### Don'ts
- **Don't** use `colors.text-inverse` (`#ffffff`) on `colors.primary` (`#f66d0f`); measured ratio 2.95 fails AA.
- **Don't** introduce custom spacing values; adhere strictly to the `[0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 80]` spacing scale.
- **Don't** use `AloaaxB` for body text; reserve it for headlines and display text to maintain hierarchy.
- **Don't** use shadows other than `rgba(0, 0, 0, 0.14) 0px 6px 8px 2px` for standard cards.
- **Don't** use border-radius values outside of the `2px`, `6px`, `12px`, `14px`, `50px` scale.
- **Don't** place primary buttons without at least `24px` of surrounding clear space.
- **Don't** use `colors.text-primary` (`#1f2124`) on `colors.surface-dark` (`#111013`) as it would have insufficient contrast.
- **Don't** deviate from `var(--motion-duration-base, 0.4s)` for larger component transitions.
- **Don't** use any z-index values other than `1`, `2`, `3`, `4`, `10`, `11`, `50` for interactive elements.
- **Don't** underline links by default; use `text-decoration: underline` only on `:hover` or `.active` states.

## 8. Responsive Behavior
Note: breakpoints below are extracted from the source CSS.

- **Suggested Breakpoints**:
  - **Mobile** (~767px): Content stacks vertically, typography scales down.
  - **Tablet** (~1180px): Navigation may condense, multi-column layouts begin.
  - **Desktop Small** (~769px): Full navigation visible, two-column layouts common.
  - **Desktop Large** (~1181px): Max container width `1220px` applied, full grid layout.

- **Touch Targets**:
  - Minimum size for interactive elements is `44px` by `44px` (inferred from common accessibility standards).
  - Maintain a minimum `8px` clear space around all touch targets (inferred from spacing scale).

- **Collapsing Strategy**:
  - **Navigation**: The main navigation bar collapses into a hamburger menu below `768px` viewport width.
  - **Cards**: Multi-column card layouts transition to single-column stacking on mobile breakpoints.
  - **Typography**: Display and heading font sizes scale down responsively to `48px` and `33px` respectively on smaller screens.
  - **Padding**: Large section padding of `80px` reduces to `40px` or `32px` on mobile for better space utilization.
  - **Forms**: Multi-field form layouts collapse to a single column, ensuring ease of input on mobile devices.
  - **Spacing**: Horizontal `20px` grid gutters may reduce to `16px` or `12px` on smaller viewports.

## 9. Agent Prompt Guide

- **Quick Color Reference**
  - Primary: `#f66d0f`
  - Primary Hover: `#e05f0a`
  - Background: `#ffffff`
  - Surface Dark: `#111013`
  - Text Primary: `#1f2124`
  - Text Inverse: `#ffffff`
  - Text Muted: `#8A8A93`
  - Border: `color-mix(in srgb, #8A8A93 15%, transparent)`
  - Focus Ring: `rgba(0, 0, 0, 0.6)`
  - Dark Text: `#f9f9f9`
  - Dark Surface: `#111013`
  - Dark Text Muted: `#c0c0c0`
  - Dark Border: `#606060`

- **Iteration Guide**:
  1. Always use `colors.primary` (`#f66d0f`) for main CTAs and interactive highlights.
  2. Ensure all text on `colors.surface-dark` (`#111013`) uses `colors.text-inverse` (`#ffffff`) or `colors.dark-text` (`#f9f9f9`).
  3. Apply `AloaaxB` `92px` `500` for primary display headings and `Aloaax` `16px` `500` for body text.
  4. Use the spacing scale `[0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 80]` for all layout and component spacing.
  5. Standard cards should have `var(--radius-md, 6px)` and `var(--elevation-card, rgba(0, 0, 0, 0.14) 0px 6px 8px 2px)`.
  6. Primary Buttons must have `16px 20px` padding, `var(--radius-sm, 5.6px)` radius, and `colors.primary-hover` (`#e05f0a`) on hover.
  7. Inputs require `12px 16px` padding, `var(--radius-sm, 2px)` radius, and a `colors.focus-ring` box-shadow on focus.
  8. Navigation links should use `colors.text-inverse` (`#ffffff`) and reduce opacity to `0.65` on hover.
  9. Utilize `var(--motion-duration-fast, 0.2s)` for micro-interactions and `var(--motion-duration-base, 0.4s)` for larger transitions.
  10. Implement responsive design using extracted breakpoints: `767px` for mobile and `1180px` for tablet.
  11. Ensure all interactive elements meet a minimum `44px` touch target size with `8px` clear spacing.
  12. Never place `colors.text-inverse` (`#ffffff`) on `colors.primary` (`#f66d0f`) due to failing AA contrast ratio (2.95).