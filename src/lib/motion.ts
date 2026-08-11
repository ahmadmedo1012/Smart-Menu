import type { Transition, Variants, TargetAndTransition } from 'motion/react';

export const springGentle: Transition = { type: 'spring', stiffness: 120, damping: 14, mass: 0.8 };
export const springDefault: Transition = { type: 'spring', stiffness: 200, damping: 20, mass: 0.8 };
export const springSnappy: Transition = { type: 'spring', stiffness: 300, damping: 24, mass: 0.7 };
export const springFloaty: Transition = { type: 'spring', stiffness: 60, damping: 10, mass: 1.2 };
export const springMagnetic: Transition = {
	type: 'spring',
	stiffness: 400,
	damping: 10,
	mass: 0.5,
};
export const springBouncy: Transition = { type: 'spring', stiffness: 500, damping: 8, mass: 0.6 };
export const easeOutQuart: Transition = { duration: 0.5, ease: [0.165, 0.84, 0.44, 1] };
export const easeSmooth: Transition = { duration: 0.35, ease: [0.16, 1, 0.2, 1] };
export const staggerFast: Variants = {
	hidden: {},
	visible: { transition: { staggerChildren: 0.04 } },
};
export const staggerMedium: Variants = {
	hidden: {},
	visible: { transition: { staggerChildren: 0.07 } },
};
export const fadeUp: Variants = {
	hidden: { opacity: 0, y: 24 },
	visible: { opacity: 1, y: 0, transition: easeOutQuart },
};
export const fadeUpSpring: Variants = {
	hidden: { opacity: 0, y: 30 },
	visible: { opacity: 1, y: 0, transition: springGentle },
};
export const scaleFade: Variants = {
	hidden: { opacity: 0, scale: 0.92 },
	visible: { opacity: 1, scale: 1, transition: springDefault },
};
export const tiltIn: Variants = {
	hidden: { opacity: 0, rotateX: -10, y: 30, scale: 0.95 },
	visible: {
		opacity: 1,
		rotateX: 0,
		y: 0,
		scale: 1,
		transition: { type: 'spring', stiffness: 200, damping: 20 },
	},
};
export const slideLeft: Variants = {
	hidden: { opacity: 0, x: 40 },
	visible: { opacity: 1, x: 0, transition: easeOutQuart },
};
export const slideUpScale: Variants = {
	hidden: { opacity: 0, y: 60, scale: 0.9 },
	visible: {
		opacity: 1,
		y: 0,
		scale: 1,
		transition: { type: 'spring', stiffness: 150, damping: 16 },
	},
};
export const cardHover: TargetAndTransition = {
	scale: 1.03,
	y: -8,
	transition: { type: 'spring', stiffness: 300, damping: 18 },
};
export const cardTap: TargetAndTransition = {
	scale: 0.97,
	transition: { type: 'spring', stiffness: 400 },
};
export const btnTap: TargetAndTransition = {
	scale: 0.92,
	transition: { type: 'spring', stiffness: 500 },
};
export const floatSlow: Variants = {
	rest: { y: 0 },
	float: { y: [-6, 6, -6], transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' } },
};
export const shimmerVariants: Variants = {
	hidden: { x: '-100%' },
	visible: { x: '200%', transition: { duration: 2, repeat: Infinity, ease: 'linear' } },
};
export const badgePop: Variants = {
	hidden: { scale: 0 },
	visible: { scale: 1, transition: { type: 'spring', stiffness: 600, damping: 10 } },
};
