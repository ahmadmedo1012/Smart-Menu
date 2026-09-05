/**
 * round86-C8/C12 — payment-channel business data, extracted from
 * PaymentDialog (753 lines of UI code used to own wallet caps, USSD code
 * math, and hardcoded fallback phone numbers baked into the client bundle).
 *
 * The phones are LAST-RESORT defaults: the live values come from
 * SystemConfig (`balance_transfer_phone_1/2`); these constants only mask a
 * misconfigured deployment so the payment flow never renders an empty
 * transfer target.
 */

/** Mobile-wallet single-transfer cap (LYD) — libyana/madar network constraint. */
export const WALLET_CAP_LYD = 99;

/** Fallback transfer phone for MADAR (config: balance_transfer_phone_1). */
export const MADAR_PHONE_FALLBACK = '0910089975';

/** Fallback transfer phone for LIBYANA (config: balance_transfer_phone_2). */
export const LIBYANA_PHONE_FALLBACK = '0942119637';

/** USSD quick-transfer code for the LIBYANA wallet (fils in the amount). */
export function libyanaUssdCode(phone: string, amountLyD: number): string {
	return `*122*218${phone.slice(1)}*${amountLyD * 1000}*1#`;
}

/** USSD quick-transfer code for the MADAR wallet. */
export function madarUssdCode(phone: string, amountLyD: number): string {
	return `*140*4*1*${amountLyD}*${phone}#`;
}

/** round87-C7: the payment channel discriminator, shared by the dialog and
 * the extracted ProviderPicker/ReceiptUpload components. */
export type PaymentProvider = 'libyana' | 'madar' | 'bank';
