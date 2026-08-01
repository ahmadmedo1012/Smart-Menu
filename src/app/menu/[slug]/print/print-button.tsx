'use client';

export function PrintButton() {
	return (
		<button type="button" onClick={() => window.print()} className="print-btn">
			🖨️ حفظ كـ PDF / طباعة
		</button>
	);
}
