/**
 * r131-F4 (r130 SO ruling — ONE theme resolution path): pre-paint theme boot.
 * DARK default; .light only when explicitly stored under the next-themes
 * default key ("theme"). enableSystem is now OFF in both group providers, so
 * this script and next-themes agree — no OS-follow, no post-hydration class
 * flip (the r130 SO fix: with enableSystem, next-themes resolved system-light
 * after hydration and flipped the class the boot script had already painted
 * → theme flash).
 *
 * Plain module (NO 'use client') so server layouts can import the string
 * directly — importing from a client module would hand the layout a
 * client-reference proxy instead of the string. Rendered body-top by both
 * group layouts (same pattern as HIGH_CONTRAST_BOOT_SCRIPT; the protected
 * tree's per-request CSP gets the nonce'd variant).
 */
export const THEME_BOOT_SCRIPT =
  "try{var t=localStorage.getItem('theme');if(t==='light')document.documentElement.classList.add('light');else document.documentElement.classList.add('dark')}catch(e){document.documentElement.classList.add('dark')}";
