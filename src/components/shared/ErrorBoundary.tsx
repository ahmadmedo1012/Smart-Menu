'use client';

import type { ReactNode, ErrorInfo } from 'react';
import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
	children: ReactNode;
	fallback?: ReactNode;
	onError?: (error: Error) => void;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, _info: ErrorInfo): void {
		this.props.onError?.(error);
	}

	private handleRetry = () => {
		this.setState({ hasError: false, error: null });
	};

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			return (
				<div className="flex flex-col items-center justify-center py-16 px-4 animate-fade-in">
					<div className="relative mb-6">
						<div className="size-14 rounded-full glass flex items-center justify-center">
							<AlertTriangle className="size-7 text-destructive" />
						</div>
						<div className="absolute -inset-2 rounded-full bg-destructive/10 blur-xl -z-10" />
					</div>
					<h2 className="text-lg font-bold mb-2">عذراً، حدث خطأ غير متوقع</h2>
					<p className="text-muted-foreground text-center max-w-sm mb-6 text-sm">
						{this.state.error?.message || 'حاول مرة أخرى'}
					</p>
					<Button onClick={this.handleRetry}>إعادة المحاولة</Button>
				</div>
			);
		}

		return this.props.children;
	}
}
