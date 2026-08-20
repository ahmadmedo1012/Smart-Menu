import { cn } from '@/lib/utils';

/**
 * QR-corner signature badge — the recurring QR/WhatsApp motif.
 * A warm ember→saffron rounded tile with a stylized QR seed pattern in its
 * corner. Decorative and (deliberately) not scannable; real QR codes for
 * scanning are rendered by the `qrcode` lib where they belong.
 * Inherits currentColor; drops into any surface, dark or light.
 */
export function QrCornerMark({
	label,
	size = 44,
	className,
}: {
	/** Accessible name for the mark. */
	label: string;
	size?: number;
	className?: string;
}) {
	return (
		<span
			className={cn('qr-corner', className)}
			role="img"
			aria-label={label}
			style={{ width: size, height: size }}
		>
			<span className="qr-seed" aria-hidden="true">
				{i(9)}
			</span>
		</span>
	);
}

function i(n: number) {
	return Array.from({ length: n }).map((_, idx) => <i key={idx} />);
}