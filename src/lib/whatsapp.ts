/**
 * Normalize a WhatsApp number to the canonical wa.me format (digits only,
 * optional leading country code).
 * Rules (shared across all senders — round-75 whatsapp agent):
 *  - strip everything except digits
 *  - convert leading "00" to "+"
 *  - remove a leading "+" (wa.me wants digits only)
 *  - validate length 8-15
 */
export function normalizeWaNumber(input: string | null | undefined): string | null {
        if (!input) return null;
        let digits = input.replace(/[^\d]/g, "");
        if (digits.startsWith("00")) digits = digits.slice(2);
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
