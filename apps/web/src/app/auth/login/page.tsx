"use client";

import { Suspense, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { login, connectWallet } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(form.email, form.password);
      router.push(redirectTo);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Sign-in failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleWalletConnect = async () => {
    setError(null);
    if (!window.ethereum) {
      setError(
        "MetaMask not detected. Please install MetaMask to use wallet sign-in."
      );
      return;
    }
    setIsLoading(true);
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      const address = accounts[0];
      const message =
        "Sign in to TitleChain: " + new Date().toISOString().slice(0, 10);
      const signature = (await window.ethereum.request({
        method: "personal_sign",
        params: [message, address],
      })) as string;
      await connectWallet(address, message, signature);
      router.push(redirectTo);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Wallet sign-in failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#080808] border-r border-white/8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.06)_0%,transparent_70%)]" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative z-10 flex flex-col justify-center px-16">
          <Link href="/" className="flex items-center space-x-2 mb-16">
            <span className="text-gold text-3xl font-bold">◈</span>
            <span className="text-white font-bold text-xl tracking-widest uppercase">
              TITLECHAIN
            </span>
          </Link>
          <h2 className="text-4xl font-extrabold text-white mb-4 tracking-tight leading-tight">
            Welcome back to the future of{" "}
            <span className="text-gold">property ownership</span>
          </h2>
          <p className="text-white/40 text-base mb-12">
            Sign in to manage your properties, track transactions, and view
            your blockchain-secured title certificates.
          </p>
          <div className="space-y-4">
            {[
              "Blockchain-immutable title records",
              "AI-powered fraud detection",
              "Smart contract escrow protection",
            ].map((item) => (
              <div key={item} className="flex items-center space-x-3">
                <div className="w-5 h-5 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-3 h-3 text-gold"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <span className="text-white/60 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-black">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10 text-center">
            <Link
              href="/"
              className="inline-flex items-center space-x-2"
            >
              <span className="text-gold text-2xl font-bold">◈</span>
              <span className="text-white font-bold text-lg tracking-widest uppercase">
                TITLECHAIN
              </span>
            </Link>
          </div>

          <h1 className="text-3xl font-bold text-gold mb-2 tracking-tight">
            Welcome Back
          </h1>
          <p className="text-white/40 mb-8 text-sm">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/register"
              className="text-gold hover:text-gold-light font-medium transition-colors"
            >
              Create one free
            </Link>
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-white/50 mb-1.5 tracking-wide uppercase"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                className="input-field"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-white/50 mb-1.5 tracking-wide uppercase"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
                className="input-field"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full mt-2"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-black text-white/30 tracking-widest uppercase">
                  or
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleWalletConnect}
              className="mt-4 w-full flex items-center justify-center gap-3 px-6 py-3 bg-transparent border border-gold/40 hover:bg-gold/5 text-gold font-semibold rounded-lg transition-colors text-sm"
            >
              <span className="text-base">🦊</span>
              Connect MetaMask Wallet
            </button>
          </div>

          <p className="mt-8 text-center text-xs text-white/20">
            Secured by Ethereum blockchain &mdash; 256-bit encryption
          </p>
        </div>
      </div>
    </div>
  );
}
