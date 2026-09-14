"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { transactionApi, workflowApi, escrowApi, Transaction } from "@/lib/api";
import {
  Shield,
  CheckCircle2,
  Clock,
  ArrowRight,
  Wallet,
  Undo2,
} from "lucide-react";

// ── Presentation helpers ─────────────────────────────────────────────────────

const ESCROW_STATUS_BADGE: Record<string, string> = {
  CREATED: "badge-status bg-white/5 text-white/50 border border-white/10",
  FUNDED: "badge-status bg-blue-400/10 text-blue-400 border border-blue-400/20",
  PARTIALLY_RELEASED: "badge-pending",
  COMPLETED: "badge-approved",
  REFUNDED: "badge-rejected",
};

const ESCROW_STATUS_LABEL: Record<string, string> = {
  CREATED: "Awaiting Funding",
  FUNDED: "Funded",
  PARTIALLY_RELEASED: "Partially Released",
  COMPLETED: "Completed",
  REFUNDED: "Refunded",
};

function userName(
  u?: { firstName?: string; lastName?: string; email: string } | null
) {
  if (!u) return "—";
  return u.firstName ? `${u.firstName} ${u.lastName ?? ""}`.trim() : u.email;
}

interface CardState {
  isActing: boolean;
  error: string | null;
}

export default function EscrowPage() {
  const { user } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cardStates, setCardStates] = useState<Record<string, CardState>>({});

  const isRegistrar = user?.role === "REGISTRAR";
  const canManageEscrow = user?.role === "REGISTRAR" || user?.role === "ADMIN";
  const canFundEscrow = user?.role === "BUYER" || user?.role === "ADMIN";

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    // Registrars/admins reviewing don't have "own" transactions the way a
    // buyer/seller does — the pending-approval queue is the closest thing to
    // a platform-wide list this API exposes today.
    const source = isRegistrar
      ? workflowApi.getPending()
      : transactionApi.list({ limit: 50 }).then((res) => ({
          success: res.success,
          data: res.data,
        }));

    source
      .then((res) => {
        if (res.success && res.data) setTransactions(res.data);
        else setError("Failed to load escrow accounts.");
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [user, isRegistrar]);

  const getCardState = (id: string): CardState =>
    cardStates[id] ?? { isActing: false, error: null };

  const setCardState = (id: string, patch: Partial<CardState>) =>
    setCardStates((prev) => ({ ...prev, [id]: { ...getCardState(id), ...patch } }));

  const patchEscrow = (
    transactionId: string,
    updater: (escrow: NonNullable<Transaction["escrow"]>) => NonNullable<Transaction["escrow"]>
  ) => {
    setTransactions((prev) =>
      prev.map((tx) =>
        tx.id === transactionId && tx.escrow
          ? { ...tx, escrow: updater(tx.escrow) }
          : tx
      )
    );
  };

  const handleFund = async (tx: Transaction) => {
    if (!tx.escrow) return;
    setCardState(tx.id, { isActing: true, error: null });
    try {
      const res = await escrowApi.fund(tx.escrow.id);
      if (res.success && res.data) {
        const updated = res.data;
        patchEscrow(tx.id, () => updated);
      }
      setCardState(tx.id, { isActing: false, error: null });
    } catch (err) {
      setCardState(tx.id, {
        isActing: false,
        error: err instanceof Error ? err.message : "Funding failed.",
      });
    }
  };

  const handleReleaseMilestone = async (tx: Transaction, index: number) => {
    if (!tx.escrow) return;
    setCardState(tx.id, { isActing: true, error: null });
    try {
      const res = await escrowApi.releaseMilestone(tx.escrow.id, index);
      if (res.success && res.data) {
        const updated = res.data;
        patchEscrow(tx.id, () => updated);
      }
      setCardState(tx.id, { isActing: false, error: null });
    } catch (err) {
      setCardState(tx.id, {
        isActing: false,
        error: err instanceof Error ? err.message : "Milestone release failed.",
      });
    }
  };

  const handleRefund = async (tx: Transaction) => {
    if (!tx.escrow) return;
    setCardState(tx.id, { isActing: true, error: null });
    try {
      const res = await escrowApi.refund(tx.escrow.id);
      if (res.success && res.data) {
        const updated = res.data;
        patchEscrow(tx.id, () => updated);
      }
      setCardState(tx.id, { isActing: false, error: null });
    } catch (err) {
      setCardState(tx.id, {
        isActing: false,
        error: err instanceof Error ? err.message : "Refund failed.",
      });
    }
  };

  const escrowedTransactions = transactions.filter((tx) => tx.escrow);

  return (
    <DashboardLayout title="Escrow">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">Escrow</h2>
        <p className="text-white/40 text-sm mt-1">
          Funds are held here between funding and title transfer, and released
          in milestones as each transaction clears registrar review.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-20">
          <div className="inline-block w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          <p className="mt-4 text-white/30 text-sm">Loading escrow accounts...</p>
        </div>
      ) : escrowedTransactions.length === 0 ? (
        <div className="text-center py-20">
          <Shield className="w-16 h-16 text-white/10 mx-auto mb-4" />
          <p className="text-white/40 font-medium text-sm">
            No escrow accounts yet
          </p>
          <p className="text-white/20 text-sm mt-1 max-w-sm mx-auto">
            {isRegistrar
              ? "Escrows tied to transactions in your review queue will show up here."
              : "An escrow account opens once a transaction on one of your properties starts moving."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {escrowedTransactions.map((tx) => {
            const escrow = tx.escrow!;
            const state = getCardState(tx.id);
            const milestones = Array.isArray(escrow.milestones)
              ? escrow.milestones
              : [];
            const nextMilestoneIndex = milestones.findIndex((m) => !m.released);
            const isBuyerOwner = tx.buyerId === user?.id;
            const showFund =
              canFundEscrow &&
              (isBuyerOwner || user?.role === "ADMIN") &&
              escrow.status === "CREATED";
            const showRelease =
              canManageEscrow &&
              nextMilestoneIndex !== -1 &&
              (escrow.status === "FUNDED" ||
                escrow.status === "PARTIALLY_RELEASED");
            const showRefund =
              canManageEscrow &&
              escrow.status !== "COMPLETED" &&
              escrow.status !== "REFUNDED";

            return (
              <div
                key={tx.id}
                className="bg-[#0d0d0d] border border-white/8 rounded-lg p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={
                          ESCROW_STATUS_BADGE[escrow.status] ??
                          "badge-status bg-white/5 text-white/50 border border-white/10"
                        }
                      >
                        {ESCROW_STATUS_LABEL[escrow.status] ?? escrow.status}
                      </span>
                    </div>
                    <p className="text-white font-semibold text-sm truncate mb-0.5">
                      {tx.property
                        ? `${tx.property.address}, ${tx.property.city}`
                        : `Transaction ${tx.id.slice(0, 8)}`}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-white/40">
                      <span>{userName(tx.buyer)}</span>
                      <ArrowRight className="w-3 h-3 flex-shrink-0" />
                      <span>{userName(tx.seller)}</span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-gold font-bold text-lg font-mono leading-none">
                      {parseFloat(escrow.amount).toLocaleString()}
                    </p>
                    <p className="text-white/30 text-xs mt-0.5">
                      {tx.currency} in escrow
                    </p>
                  </div>
                </div>

                {/* Milestones */}
                {milestones.length > 0 && (
                  <div className="border-t border-white/8 pt-3 space-y-2">
                    {milestones.map((m, i) => (
                      <div
                        key={m.id ?? i}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {m.released ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-white/20 flex-shrink-0" />
                          )}
                          <span
                            className={`truncate ${
                              m.released ? "text-white/50" : "text-white/70"
                            }`}
                          >
                            {m.description}
                          </span>
                        </div>
                        <span className="text-white/30 font-mono text-xs flex-shrink-0">
                          {parseFloat(m.amount).toLocaleString()} {tx.currency}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {state.error && (
                  <p className="text-red-400 text-xs mt-3">{state.error}</p>
                )}

                {(showFund || showRelease || showRefund) && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/8">
                    {showFund && (
                      <button
                        onClick={() => handleFund(tx)}
                        disabled={state.isActing}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-400/10 hover:bg-blue-400/20 border border-blue-400/20 text-blue-400 transition-colors disabled:opacity-50"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        {state.isActing ? "Funding..." : "Fund Escrow"}
                      </button>
                    )}
                    {showRelease && (
                      <button
                        onClick={() => handleReleaseMilestone(tx, nextMilestoneIndex)}
                        disabled={state.isActing}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-400/10 hover:bg-emerald-400/20 border border-emerald-400/20 text-emerald-400 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {state.isActing
                          ? "Releasing..."
                          : `Release "${milestones[nextMilestoneIndex]?.description}"`}
                      </button>
                    )}
                    {showRefund && (
                      <button
                        onClick={() => handleRefund(tx)}
                        disabled={state.isActing}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-400/10 hover:bg-red-400/20 border border-red-400/20 text-red-400 transition-colors disabled:opacity-50"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        {state.isActing ? "Refunding..." : "Refund"}
                      </button>
                    )}
                    <Link
                      href={`/transactions/${tx.id}`}
                      className="ml-auto text-xs text-white/30 hover:text-gold self-center transition-colors"
                    >
                      View transaction
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
