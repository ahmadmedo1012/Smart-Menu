/**
 * r131-F4 (r130 SO ruling — ONE theme resolution path): pre-paint theme boot.
 * Phase 5 (r152): LIGHT default (Warm Culinary Editorial); .dark ("warm
 * night kitchen") only when explicitly stored under the next-themes default
 * key ("theme"). enableSystem is OFF in both group providers, so this script
 * and next-themes agree — no OS-follow, no post-hydration class flip (the
 * r130 SO fix).
 *
 * Plain module (NO 'use client') so server layouts can import the string
 * directly — importing from a client module would hand the layout a
 * client-reference proxy instead of the string. Rendered body-top by both
 * group layouts (same pattern as HIGH_CONTRAST_BOOT_SCRIPT; the protected
 * tree's per-request CSP gets the nonce'd variant).
 */
export const THEME_BOOT_SCRIPT =
  "try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark');else document.documentElement.classList.add('light')}catch(e){document.documentElement.classList.add('light')}";
