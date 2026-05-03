import { Component, type ReactNode } from "react";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) return this.props.fallback;
			return (
				<div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
					<p className="text-sm font-medium text-stone-800 mb-1">Something went wrong</p>
					<p className="text-xs text-stone-500 mb-4 max-w-md">{this.state.error?.message}</p>
					<button
						type="button"
						onClick={() => this.setState({ hasError: false, error: null })}
						className="px-3 py-1.5 text-xs font-medium rounded-md bg-stone-100 hover:bg-stone-200 text-stone-600"
					>
						Try again
					</button>
				</div>
			);
		}
		return this.props.children;
	}
}
