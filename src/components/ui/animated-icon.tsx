"use client";
'use client';

import { forwardRef, useRef, useImperativeHandle } from 'react';
import type { AnimatedIconHandle, AnimatedIconProps } from '@/components/ui/types';

// Re-export the types so consumers can type refs uniformly
export type { AnimatedIconHandle, AnimatedIconProps };

/**
 * Unified animated icon wrapper.
 *
 * Drop-in replacement for lucide icons with identical props
 * (size / color / className / strokeWidth) but with hover animations
 * from itshover / motion.
 *
 * Usage:
 *   const ref = useRef<AnimatedIconHandle>(null);
 *   <AnimatedIcon as={StarIcon} ref={ref} className="size-5" />
 *   ref.current?.startAnimation(); // imperative trigger
 *
 * Hover triggers animation automatically (itshover components do this
 * internally); the ref lets us trigger it programmatically (e.g. when an
 * order arrives, a tab is active, etc.).
 */
export const AnimatedIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps & { as: React.ComponentType<AnimatedIconProps> }>(
	({ as: Icon, ...props }, ref) => {
		const innerRef = useRef<AnimatedIconHandle>(null);

		useImperativeHandle(ref, () => ({
			startAnimation: () => innerRef.current?.startAnimation(),
			stopAnimation: () => innerRef.current?.stopAnimation(),
		}));

		// @ts-expect-error — the inner ref is forwarded through the icon component
		return <Icon ref={innerRef} {...props} />;
	},
);

AnimatedIcon.displayName = 'AnimatedIcon';

/**
 * Higher-order helper: build a stable animated icon wrapper for a given
 * itshover component so call sites can use plain <Icon /> like lucide.
 */
export function withHoverAnimation<T extends AnimatedIconProps>(
	Icon: React.ComponentType<T>,
): React.ForwardRefExoticComponent<React.PropsWithoutRef<T> & React.RefAttributes<AnimatedIconHandle>> {
	return forwardRef<AnimatedIconHandle, T>((props, ref) => <AnimatedIcon ref={ref} as={Icon as React.ComponentType<AnimatedIconProps>} {...(props as AnimatedIconProps)} />);
}
