"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { LogOut, Wallet } from "lucide-react";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

const KYC_STATUS_BADGE: Record<string, string> = {
  VERIFIED: "badge-approved",
  PENDING: "badge-pending",
  REJECTED: "badge-rejected",
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-white/40 tracking-wide uppercase mb-1">
        {label}
      </p>
      <p className="text-white text-sm">{value}</p>
    </div>
  );
}

export default function SettingsPage() {
  const { user, logout, connectWallet } = useAuth();
  const router = useRouter();

  const [isConnecting, setIsConnecting] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`
      : user?.email?.[0]?.toUpperCase() ?? "U";

  const fullName =
    user?.firstName || user?.lastName
      ? `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()
      : "—";

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  const handleConnectWallet = async () => {
    setWalletError(null);
    if (!window.ethereum) {
      setWalletError("MetaMask not detected. Please install MetaMask to connect a wallet.");
      return;
    }
    setIsConnecting(true);
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      const address = accounts[0];
      const message = "Link wallet to TitleChain: " + new Date().toISOString().slice(0, 10);
      const signature = (await window.ethereum.request({
        method: "personal_sign",
        params: [message, address],
      })) as string;
      await connectWallet(address, message, signature);
    } catch (err) {
      setWalletError(
        err instanceof Error ? err.message : "Wallet connection failed."
      );
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <DashboardLayout title="Settings">
      <div className="max-w-2xl">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white tracking-tight">Settings</h2>
          <p className="text-white/40 text-sm mt-1">
            Your TitleChain account details.
          </p>
        </div>

        {/* Profile */}
        <div className="bg-[#0d0d0d] border border-white/8 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-gold/20 border border-gold/30 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-gold font-semibold text-lg">{initials}</span>
            </div>
            <div>
              <p className="text-white font-semibold">{fullName}</p>
              <p className="text-white/40 text-sm">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Role" value={user?.role ?? "—"} />
            <div>
              <p className="text-xs font-medium text-white/40 tracking-wide uppercase mb-1">
                KYC Status
              </p>
              <span
                className={
                  KYC_STATUS_BADGE[user?.kycStatus ?? ""] ??
                  "badge-status bg-white/5 text-white/50 border border-white/10"
                }
              >
                {user?.kycStatus ?? "PENDING"}
              </span>
            </div>
          </div>
        </div>

        {/* Wallet */}
        <div className="bg-[#0d0d0d] border border-white/8 rounded-lg p-6 mb-6">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-4">
            Blockchain Wallet
          </h3>

          {walletError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-xs">{walletError}</p>
            </div>
          )}

          {user?.walletAddress ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center flex-shrink-0">
                <Wallet className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-white/70 text-sm font-mono break-all">
                {user.walletAddress}
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <p className="text-white/40 text-sm">No wallet connected.</p>
              <button
                onClick={handleConnectWallet}
                disabled={isConnecting}
                className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>🦊</span>
                {isConnecting ? "Connecting..." : "Connect MetaMask"}
              </button>
            </div>
          )}
        </div>

        {/* Session */}
        <div className="bg-[#0d0d0d] border border-white/8 rounded-lg p-6">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-4">
            Session
          </h3>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
