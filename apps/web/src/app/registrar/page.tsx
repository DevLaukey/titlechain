"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { workflowApi, Transaction } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import {
  ClipboardCheck,
  AlertTriangle,
  ArrowRight,
  Check,
  X,
} from "lucide-react";

// ── Utility ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (days > 0) return `${days} day${days === 1 ? "" : "s"} ago`;
  if (hours > 0) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  if (minutes > 0) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  return "just now";
}

function userName(
  u?: { firstName?: string; lastName?: string; email: string } | null
) {
  if (!u) return "—";
  return u.firstName ? `${u.firstName} ${u.lastName ?? ""}`.trim() : u.email;
}

// ── Types for per-card state ──────────────────────────────────────────────────

interface CardState {
  expanded: "approve" | "reject" | null;
  notes: string;
  isActing: boolean;
  error: string | null;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function RegistrarPage() {
  const { user } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fadingOutId, setFadingOutId] = useState<string | null>(null);
  const [cardStates, setCardStates] = useState<Record<string, CardState>>({});

  const isAllowed =
    user?.role === "REGISTRAR" || user?.role === "ADMIN";

  const loadPending = useCallback(() => {
    setIsLoading(true);
    setError(null);
    workflowApi
      .getPending()
      .then((res) => {
        if (res.success && res.data) {
          setTransactions(res.data);
        } else {
          setError("Failed to load pending transactions.");
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (isAllowed) {
      loadPending();
    } else {
      setIsLoading(false);
    }
  }, [isAllowed, loadPending]);

  // ── Card state helpers ───────────────────────────────────────────────────────

  const getCardState = (id: string): CardState =>
    cardStates[id] ?? { expanded: null, notes: "", isActing: false, error: null };

  const setCardState = (id: string, patch: Partial<CardState>) =>
    setCardStates((prev) => ({
      ...prev,
      [id]: { ...getCardState(id), ...patch },
    }));

  const toggleExpanded = (
    id: string,
    action: "approve" | "reject"
  ) => {
    const current = getCardState(id);
    const next =
      current.expanded === action ? null : action;
    setCardState(id, { expanded: next, notes: "", error: null });
  };

  // ── Action handlers ──────────────────────────────────────────────────────────

  const removeCard = (id: string) => {
    setFadingOutId(id);
    setTimeout(() => {
      setTransactions((prev) => prev.filter((tx) => tx.id !== id));
      setFadingOutId(null);
    }, 350);
  };

  const handleApprove = async (tx: Transaction) => {
    const state = getCardState(tx.id);
    setCardState(tx.id, { isActing: true, error: null });
    try {
      await workflowApi.approve(tx.id, state.notes || undefined);
      removeCard(tx.id);
    } catch (err: unknown) {
      setCardState(tx.id, {
        isActing: false,
        error: err instanceof Error ? err.message : "Approval failed.",
      });
    }
  };

  const handleReject = async (tx: Transaction) => {
    const state = getCardState(tx.id);
    if (!state.notes.trim()) return;
    setCardState(tx.id, { isActing: true, error: null });
    try {
      await workflowApi.reject(tx.id, state.notes);
      removeCard(tx.id);
    } catch (err: unknown) {
      setCardState(tx.id, {
        isActing: false,
        error: err instanceof Error ? err.message : "Rejection failed.",
      });
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout title="Registrar Queue">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Approval Queue
        </h2>
        <p className="text-white/40 text-sm mt-1">
          Transactions pending government review
        </p>
      </div>

      {/* Access denied */}
      {!isAllowed && (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-16 h-16 bg-gold/10 border border-gold/20 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-gold" />
          </div>
          <h3 className="text-white font-bold text-lg mb-2">Access Restricted</h3>
          <p className="text-white/40 text-sm text-center max-w-sm">
            Access restricted to registrars. Your current role is{" "}
            <span className="text-white/60 font-mono">{user?.role ?? "unknown"}</span>.
          </p>
          <Link href="/dashboard" className="btn-secondary text-sm mt-6">
            Back to Dashboard
          </Link>
        </div>
      )}

      {/* Allowed content */}
      {isAllowed && (
        <>
          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Loading */}
          {isLoading ? (
            <div className="text-center py-20">
              <div className="inline-block w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
              <p className="mt-4 text-white/30 text-sm">
                Loading pending transactions...
              </p>
            </div>
          ) : transactions.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-16 h-16 bg-emerald-400/10 border border-emerald-400/20 rounded-full flex items-center justify-center mb-4">
                <ClipboardCheck className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-white font-semibold text-base mb-2">
                All clear
              </h3>
              <p className="text-white/40 text-sm">
                No transactions pending review
              </p>
            </div>
          ) : (
            /* Transaction list */
            <div className="space-y-4">
              <p className="text-xs text-white/30 tracking-wide">
                {transactions.length} transaction{transactions.length !== 1 ? "s" : ""} pending review
              </p>

              {transactions.map((tx) => {
                const state = getCardState(tx.id);
                const isFading = fadingOutId === tx.id;

                return (
                  <div
                    key={tx.id}
                    className={`bg-[#0d0d0d] border border-white/8 rounded-lg overflow-hidden transition-opacity duration-300 ${
                      isFading ? "opacity-0" : "opacity-100"
                    }`}
                  >
                    {/* Card body */}
                    <div className="p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Property info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm truncate mb-0.5">
                            {tx.property
                              ? `${tx.property.address}, ${tx.property.city}`
                              : `Transaction ${tx.id.slice(0, 8)}`}
                          </p>
                          {tx.property && (
                            <p className="text-xs text-white/30 font-mono mb-2">
                              {tx.property.titleNumber}
                            </p>
                          )}

                          {/* Buyer → Seller */}
                          <div className="flex items-center gap-1.5 text-xs text-white/50">
                            <span className="text-white/70">
                              {userName(tx.buyer)}
                            </span>
                            <ArrowRight className="w-3 h-3 flex-shrink-0" />
                            <span className="text-white/70">
                              {userName(tx.seller)}
                            </span>
                          </div>
                        </div>

                        {/* Price + time + actions */}
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-gold font-bold text-base font-mono leading-none">
                              {parseFloat(tx.salePrice).toLocaleString()}
                            </p>
                            <p className="text-white/30 text-xs mt-0.5">
                              {tx.currency}
                            </p>
                            <p className="text-white/20 text-xs mt-1">
                              {timeAgo(tx.createdAt)}
                            </p>
                          </div>

                          {/* Inline action buttons */}
                          <div className="flex flex-col gap-1.5">
                            <button
                              onClick={() => toggleExpanded(tx.id, "approve")}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                                state.expanded === "approve"
                                  ? "bg-emerald-500 border-emerald-500 text-white"
                                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                              Approve
                            </button>
                            <button
                              onClick={() => toggleExpanded(tx.id, "reject")}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                                state.expanded === "reject"
                                  ? "bg-red-500 border-red-500 text-white"
                                  : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                              }`}
                            >
                              <X className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Inline form — shown when approve or reject is expanded */}
                    {state.expanded && (
                      <div className="border-t border-white/8 p-5 bg-[#111111]">
                        <p className="text-xs text-white/50 mb-2 font-medium">
                          {state.expanded === "approve"
                            ? "Approval notes (optional)"
                            : "Reason for rejection (required)"}
                        </p>
                        <textarea
                          value={state.notes}
                          onChange={(e) =>
                            setCardState(tx.id, { notes: e.target.value })
                          }
                          placeholder={
                            state.expanded === "approve"
                              ? "Add any notes for the record..."
                              : "Describe why this transaction is being rejected..."
                          }
                          rows={3}
                          className="input-field text-sm py-2 resize-none mb-3"
                        />
                        {state.error && (
                          <p className="text-red-400 text-xs mb-2">
                            {state.error}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          {state.expanded === "approve" ? (
                            <button
                              onClick={() => handleApprove(tx)}
                              disabled={state.isActing}
                              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50"
                            >
                              {state.isActing ? "Processing..." : "Confirm Approval"}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReject(tx)}
                              disabled={
                                state.isActing || !state.notes.trim()
                              }
                              className="px-4 py-2 bg-red-500 hover:bg-red-400 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {state.isActing ? "Processing..." : "Confirm Rejection"}
                            </button>
                          )}
                          <button
                            onClick={() =>
                              setCardState(tx.id, { expanded: null, notes: "", error: null })
                            }
                            className="px-3 py-2 text-white/30 hover:text-white text-sm transition-colors"
                          >
                            Cancel
                          </button>
                          <Link
                            href={`/transactions/${tx.id}`}
                            className="ml-auto text-xs text-gold hover:text-gold-light transition-colors"
                          >
                            View details
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
