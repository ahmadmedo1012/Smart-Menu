/**
 * Normalize a WhatsApp number to the canonical wa.me format (digits only,
 * optional leading country code).
 * Rules (shared across all senders — round-75 whatsapp agent):
 *  - strip everything except digits
 *  - convert leading "00" to "+"
 *  - remove a leading "+" (wa.me wants digits only)
 *  - r109-F2: a leading "0" is a LOCAL trunk prefix, never a valid E.164
 *    start (country codes begin 1-9) — wa.me rejected the number verbatim so
 *    orders to local-format restaurants were never delivered (live-proven
 *    r107/r108). This platform's restaurants are Libyan: strip the trunk 0
 *    and prepend 218 (0912345678 → 218912345678).
 *  - validate length 8-15
 *  - r133-A12 M1: Eastern Arabic digits (٠٩١٢…) fold to Western FIRST —
 *    `\d` is ASCII-only, so the strip below used to delete them to "" →
 *    null → the owner's saved number silently killed every wa.me link
 *    (same failure class as the r109 trunk-0 bug; SO phone.ts is the twin).
 */
export function normalizeWaNumber(input: string | null | undefined): string | null {
        if (!input) return null;
        const western = input.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
        let digits = western.replace(/[^\d]/g, "");
        if (digits.startsWith("00")) digits = digits.slice(2);
        if (digits.startsWith("0")) {
                // plausible Libyan local formats are 9-11 digits (09XXXXXXXX mobile,
                // 0XXXXXXXX landline); shorter is garbage (stays null as before),
                // longer can't be E.164 either way.
                if (digits.length >= 9 && digits.length <= 11) digits = `218${digits.slice(1)}`;
                else return null;
        }
        // 8-15 digits (E.164 international)
        if (digits.length < 8 || digits.length > 15) return null;
        return digits;
}

/**
 * round97-X3: single canonical wa.me URL builder (was hand-rolled in 5
 * components — ReferralCard, ShareAfterOrder, order-confirmed, owner/loyalty,
 * cart — each repeating encodeURIComponent + the wa.me template).
 * - without a number → the share-picker deep link (https://wa.me/?text=…)
 * - with a number    → a chat deep link (https://wa.me/<number>?text=…)
 * The number is passed through VERBATIM (pure refactor: identical URLs out)
 * — callers that want canonical digits normalize first via
 * normalizeWaNumber (see the whatsapp/generate money path).
 */
export function buildWhatsAppShareUrl(text: string, number?: string | null): string {
        const encoded = encodeURIComponent(text);
        return number ? `https://wa.me/${number}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}
