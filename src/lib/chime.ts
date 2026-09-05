/**
 * round86-C3 — the notification chime, unified.
 *
 * Three byte-identical Web-Audio beep implementations lived in NewOrdersBar,
 * OrderNotifier and AdminEventNotifier (each with its own
 * `webkitAudioContext` any-cast). This is the single spelling — typed, best
 * effort, and silent when audio is unavailable.
 */

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | undefined {
	if (typeof window === 'undefined') return undefined;
	const w = window as Window & { webkitAudioContext?: AudioContextCtor };
	return window.AudioContext ?? w.webkitAudioContext;
}

/** Play a short sine beep. Never throws; no-op when audio is unavailable. */
export function playBeep(freq: number, duration: number): void {
	try {
		const Ctor = getAudioContextCtor();
		if (!Ctor) return;
		const ctx = new Ctor();
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.type = 'sine';
		osc.frequency.value = freq;
		gain.gain.setValueAtTime(0.2, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
		osc.start(ctx.currentTime);
		osc.stop(ctx.currentTime + duration);
	} catch {
		/* audio unavailable — silent no-op */
	}
}

/** Play a gentle 3-note arpeggio chime (C5-E5-G5). Never throws. */
export function playChime(): void {
	try {
		const Ctor = getAudioContextCtor();
		if (!Ctor) return;
		const ctx = new Ctor();
		[523.25, 659.25, 783.99].forEach((freq, i) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.type = 'sine';
			osc.frequency.value = freq;
			gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.12);
			gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3);
			osc.start(ctx.currentTime + i * 0.12);
			osc.stop(ctx.currentTime + i * 0.12 + 0.3);
		});
	} catch {
		/* audio unavailable — silent no-op */
	}
}
