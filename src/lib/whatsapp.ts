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

/** Resolve the WhatsApp number for a restaurant with env fallback. */
export function resolveWhatsApp(
	restaurantNumber: string | null | undefined,
	envFallback?: string
): string | null {
	return normalizeWaNumber(restaurantNumber) ?? normalizeWaNumber(envFallback);
}
