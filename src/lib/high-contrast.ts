/**
 * round88-E2 — High-contrast / large-text mode constants.
 *
 * Plain module (NO 'use client') so server layouts can import the boot script
 * string directly — importing a value from a client module would hand the
 * layout a client-reference proxy instead of the string.
 */
export const HIGH_CONTRAST_STORAGE_KEY = 'smart-menu-high-contrast';

/** Pre-paint snippet — reads localStorage and stamps the class on <html>
 *  before first paint (no flash). Inlined by both root layouts:
 *  public pages (CSP allows 'unsafe-inline') and protected pages (nonce'd). */
export const HIGH_CONTRAST_BOOT_SCRIPT = `try{var t=localStorage.getItem('${HIGH_CONTRAST_STORAGE_KEY}');if(t==='1')document.documentElement.classList.add('high-contrast')}catch(e){}`;
