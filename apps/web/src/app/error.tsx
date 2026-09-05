"use client";

import { AlertCircle } from "lucide-react";

interface ErrorPageProps {
  error: Error;
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="bg-[#0d0d0d] border border-white/8 rounded-lg p-8 max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <AlertCircle className="w-12 h-12 text-red-400" />
        </div>
        <h1 className="text-white text-xl font-bold mb-3 tracking-wide">
          Something went wrong
        </h1>
        <p className="text-white/40 text-sm font-mono mb-8 break-all">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center px-6 py-3 bg-[#D4AF37] hover:bg-[#E8C84A] text-black font-semibold rounded-lg transition-colors text-sm"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
