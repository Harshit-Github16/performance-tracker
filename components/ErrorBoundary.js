"use client";

import React from "react";

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        this.setState({
            error,
            errorInfo
        });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                        <div className="flex flex-col items-center text-center">
                            {/* Error Icon */}
                            <div className="h-16 w-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>

                            {/* Error Message */}
                            <h2 className="text-xl font-bold text-gray-950 mb-2">Something went wrong</h2>
                            <p className="text-sm text-gray-500 mb-6">
                                We're sorry, but something unexpected happened. Please try refreshing the page.
                            </p>

                            {/* Error Details (Development Only) */}
                            {process.env.NODE_ENV === "development" && this.state.error && (
                                <details className="w-full mb-6 text-left">
                                    <summary className="text-xs font-semibold text-gray-600 cursor-pointer hover:text-gray-900 mb-2">
                                        Error Details (Dev Only)
                                    </summary>
                                    <div className="bg-gray-50 rounded-lg p-4 text-xs font-mono text-red-600 overflow-auto max-h-40">
                                        <p className="font-bold mb-2">{this.state.error.toString()}</p>
                                        <pre className="text-gray-600 whitespace-pre-wrap">
                                            {this.state.errorInfo?.componentStack}
                                        </pre>
                                    </div>
                                </details>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => window.location.reload()}
                                    className="flex-1 px-4 py-3 bg-gray-950 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all"
                                >
                                    Refresh Page
                                </button>
                                <button
                                    onClick={() => window.location.href = "/dashboard"}
                                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-all"
                                >
                                    Go to Dashboard
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
