'use client';

import { Printer } from 'lucide-react';

export function PrintButton() {
	return (
		<button type="button" onClick={() => window.print()} className="print-btn flex items-center gap-2">
			<Printer className="size-4" />
			حفظ كـ PDF / طباعة
		</button>
	);
}
