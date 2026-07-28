'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/store/cart';
import { toArabicNumber } from '@/lib/format';
import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function CartFloatingButton() {
	const totalItems = useCart((s) => s.totalItems());
	const prevRef = useRef(totalItems);
	const [bounce, setBounce] = useState(false);

	useEffect(() => {
		if (totalItems > prevRef.current && prevRef.current > 0) {
			setBounce(true);
			const t = setTimeout(() => setBounce(false), 500);
			prevRef.current = totalItems;
			return () => clearTimeout(t);
		}
		prevRef.current = totalItems;
	}, [totalItems]);

	if (totalItems === 0) return null;

	return (
		<motion.div
			initial={{ y: 50, opacity: 0 }}
			animate={{ y: 0, opacity: 1 }}
			transition={{ type: 'spring', stiffness: 300, damping: 25 }}
			className="fixed bottom-[calc(env(safe-area-inset-bottom)+7.5rem)] end-4 sm:end-6 z-[63]"
		>
			<Link
				href="/cart"
				aria-label={`السلة - ${toArabicNumber(totalItems)} أصناف`}
				className={cn(
					'flex items-center justify-center size-14 rounded-full',
					'bg-orange/90 backdrop-blur-xl',
					'shadow-2xl shadow-orange/30 ring-1 ring-white/10',
					'hover:shadow-orange/40 hover:scale-105',
					'active:scale-95 transition-all duration-300 ease-out',
					bounce && 'scale-110'
				)}
			>
				<div className="relative">
					<ShoppingCart className="size-5 text-orange-foreground" />
					<span
						className={cn(
							'absolute -top-2.5 -end-2.5 min-w-[18px] h-[18px] rounded-full',
							'bg-orange-foreground text-orange text-[10px] font-bold',
							'flex items-center justify-center px-1',
							'transition-all duration-300',
							bounce && 'scale-125'
						)}
					>
						{totalItems > 9 ? '9+' : toArabicNumber(totalItems)}
					</span>
				</div>
			</Link>
		</motion.div>
	);
}
