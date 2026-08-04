'use client';

import { Plus, Check, Minus, Search, Phone, MapPin, Store, Crown, Award, Gift, Medal, Settings, TrendingUp, Activity, BarChart3, ArrowLeft, ArrowRight, Smartphone, Menu as MenuIcon, ChevronLeft, ChevronRight, AlertTriangle, Building2, Landmark, CreditCard, LogIn, Lightbulb, Stethoscope } from 'lucide-react';
import { motion } from 'framer-motion';
import { forwardRef, type SVGProps } from 'react';

/**
 * Motion-enhanced lucide icons (Plan B — for icons not in the itshover
 * catalog). Adds a subtle hover spring without changing the icon's
 * appearance, size or color API — drop-in replacement for plain lucide.
 */
type MotionIconProps = SVGProps<SVGSVGElement>;

function makeMotionIcon(Icon: typeof Plus, label: string) {
	const Cmp = forwardRef<SVGSVGElement, MotionIconProps>(({ className, width, height, ...rest }, ref) => (
		<motion.svg
			ref={ref}
			className={className}
			width={width}
			height={height}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			{...(rest as object)}
			whileHover={{ scale: 1.14, rotate: label === 'Plus' ? 90 : label === 'Check' ? [0, 10, 0] : undefined }}
			transition={{ type: 'spring', stiffness: 400, damping: 15 }}
		>
			<Icon {...(rest as object)} />
		</motion.svg>
	));
	Cmp.displayName = `Motion${label}`;
	return Cmp;
}

export const MotionPlus = makeMotionIcon(Plus, 'Plus');
export const MotionCheck = makeMotionIcon(Check, 'Check');
export const MotionMinus = makeMotionIcon(Minus, 'Minus');
export const MotionSearch = makeMotionIcon(Search, 'Search');
export const MotionPhone = makeMotionIcon(Phone, 'Phone');
export const MotionMapPin = makeMotionIcon(MapPin, 'MapPin');
export const MotionStore = makeMotionIcon(Store, 'Store');
export const MotionCrown = makeMotionIcon(Crown, 'Crown');
export const MotionAward = makeMotionIcon(Award, 'Award');
export const MotionGift = makeMotionIcon(Gift, 'Gift');
export const MotionMedal = makeMotionIcon(Medal, 'Medal');
export const MotionSettings = makeMotionIcon(Settings, 'Settings');
export const MotionTrendingUp = makeMotionIcon(TrendingUp, 'TrendingUp');
export const MotionActivity = makeMotionIcon(Activity, 'Activity');
export const MotionBarChart3 = makeMotionIcon(BarChart3, 'BarChart3');
export const MotionArrowLeft = makeMotionIcon(ArrowLeft, 'ArrowLeft');
export const MotionArrowRight = makeMotionIcon(ArrowRight, 'ArrowRight');
export const MotionSmartphone = makeMotionIcon(Smartphone, 'Smartphone');
export const MotionMenu = makeMotionIcon(MenuIcon, 'Menu');
export const MotionChevronLeft = makeMotionIcon(ChevronLeft, 'ChevronLeft');
export const MotionChevronRight = makeMotionIcon(ChevronRight, 'ChevronRight');
export const MotionAlertTriangle = makeMotionIcon(AlertTriangle, 'AlertTriangle');
export const MotionBuilding2 = makeMotionIcon(Building2, 'Building2');
export const MotionLandmark = makeMotionIcon(Landmark, 'Landmark');
export const MotionCreditCard = makeMotionIcon(CreditCard, 'CreditCard');
export const MotionLogIn = makeMotionIcon(LogIn, 'LogIn');
export const MotionLightbulb = makeMotionIcon(Lightbulb, 'Lightbulb');
export const MotionStethoscope = makeMotionIcon(Stethoscope, 'Stethoscope');
