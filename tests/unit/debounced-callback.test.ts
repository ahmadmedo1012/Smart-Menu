import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDebounced } from '@/components/menu/MenuToolbar';

describe('createDebounced (core used by useDebouncedCallback)', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('fires only the last call after the delay when invoked rapidly', () => {
		const fn = vi.fn();
		const d = createDebounced(fn, 275);

		d.call('a');
		d.call('b');
		d.call('c');
		expect(fn).not.toHaveBeenCalled();

		vi.advanceTimersByTime(275);
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith('c');
	});

	it('resets the pending timer on every call (trailing-edge debounce)', () => {
		const fn = vi.fn();
		const d = createDebounced(fn, 275);

		d.call('x');
		vi.advanceTimersByTime(200); // still inside window
		d.call('y');
		vi.advanceTimersByTime(200); // still inside window
		expect(fn).not.toHaveBeenCalled();

		vi.advanceTimersByTime(100); // 275ms after last call
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith('y');
	});

	it('cancel() drops the pending call', () => {
		const fn = vi.fn();
		const d = createDebounced(fn, 275);

		d.call('x');
		d.cancel();
		vi.advanceTimersByTime(500);
		expect(fn).not.toHaveBeenCalled();
	});
});
