'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
	const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

	useEffect(() => {
		const handler = (e: Event) => {
			e.preventDefault();
			setDeferredPrompt(e as BeforeInstallPromptEvent);
		};
		window.addEventListener('beforeinstallprompt', handler);
		return () => window.removeEventListener('beforeinstallprompt', handler);
	}, []);

	const handleInstall = async () => {
		if (!deferredPrompt) return;
		deferredPrompt.prompt();
		const { outcome } = await deferredPrompt.userChoice;
		if (outcome === 'accepted') setDeferredPrompt(null);
	};

	if (!deferredPrompt) return null;

	return (
		<button
			onClick={handleInstall}
			// ponytail: one install button, replace with your own styling when a design exists
			style={{
				position: 'fixed',
				bottom: 80,
				left: '50%',
				transform: 'translateX(-50%)',
				zIndex: 9999,
				padding: '12px 24px',
				background: 'var(--color-popover, #000)',
				color: 'var(--color-popover-foreground, #fff)',
				border: 'none',
				borderRadius: 8,
				cursor: 'pointer',
				fontSize: 16,
			}}
		>
			تثبيت التطبيق
		</button>
	);
}
