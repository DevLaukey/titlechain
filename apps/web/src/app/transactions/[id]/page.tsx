"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  transactionApi,
  workflowApi,
  escrowApi,
  Transaction,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Circle,
  Clock,
  AlertCircle,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

// ── Status helpers ─────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  INITIATED: "badge-status bg-white/5 text-white/50 border border-white/10",
  AI_REVIEW: "badge-pending",
  ESCROW_FUNDED:
    "badge-status bg-blue-400/10 text-blue-400 border border-blue-400/20",
  GOV_REVIEW: "badge-pending",
  APPROVED: "badge-approved",
  TRANSFER_COMPLETE: "badge-transferred",
  CANCELLED: "badge-rejected",
};

const STATUS_LABEL: Record<string, string> = {
  INITIATED: "Initiated",
  AI_REVIEW: "AI Review",
  ESCROW_FUNDED: "Escrow Funded",
  GOV_REVIEW: "Gov Review",
  APPROVED: "Approved",
  TRANSFER_COMPLETE: "Transfer Complete",
  CANCELLED: "Cancelled",
};

const GOV_ACTION_BADGE: Record<string, string> = {
  APPROVED: "badge-approved",
  REJECTED: "badge-rejected",
  REVIEW_INITIATED: "badge-pending",
};

// ── Timeline definition ────────────────────────────────────────────────────────

const TIMELINE_STEPS = [
  { key: "INITIATED", label: "Initiated" },
  { key: "AI_REVIEW", label: "AI Review" },
  { key: "ESCROW_FUNDED", label: "Escrow Funded" },
  { key: "GOV_REVIEW", label: "Gov Review" },
  { key: "APPROVED", label: "Approved" },
  { key: "TRANSFER_COMPLETE", label: "Transfer Complete" },
];

// ── Utility formatters ─────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function userName(
  u?: { firstName?: string; lastName?: string; email: string } | null
) {
  if (!u) return "—";
  return u.firstName ? `${u.firstName} ${u.lastName ?? ""}`.trim() : u.email;
}

// ── Main page component ────────────────────────────────────────────────────────

export default function TransactionDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : (params.id?.[0] ?? "");

  const { user } = useAuth();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action state
  const [showApproveForm, setShowApproveForm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [approveNotes, setApproveNotes] = useState("");
  const [rejectNotes, setRejectNotes] = useState("");
  const [isActing, setIsActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadTransaction = useCallback(() => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    transactionApi
      .getById(id)
      .then((res) => {
        if (res.success && res.data) {
          setTransaction(res.data);
        } else {
          setError("Transaction not found.");
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => {
    loadTransaction();
  }, [loadTransaction]);

  // ── Derived values ───────────────────────────────────────────────────────────

  const isRegistrar =
    user?.role === "REGISTRAR" || user?.role === "ADMIN";
  const isBuyer = user?.id === transaction?.buyerId;
  const isSeller = user?.id === transaction?.sellerId;

  const currentStepIndex =
    transaction?.status === "CANCELLED"
      ? -1
      : TIMELINE_STEPS.findIndex((s) => s.key === transaction?.status);

  // ── Action handlers ──────────────────────────────────────────────────────────

  const handleSubmitForReview = async () => {
    if (!transaction) return;
    setIsActing(true);
    setActionError(null);
    try {
      await workflowApi.submit(transaction.id);
      setActionSuccess("Transaction submitted for government review.");
      loadTransaction();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setIsActing(false);
    }
  };

  const handleApprove = async () => {
    if (!transaction) return;
    setIsActing(true);
    setActionError(null);
    try {
      await workflowApi.approve(transaction.id, approveNotes || undefined);
      setActionSuccess("Transaction approved.");
      setShowApproveForm(false);
      loadTransaction();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Approval failed.");
    } finally {
      setIsActing(false);
    }
  };

  const handleReject = async () => {
    if (!transaction || !rejectNotes.trim()) return;
    setIsActing(true);
    setActionError(null);
    try {
      await workflowApi.reject(transaction.id, rejectNotes);
      setActionSuccess("Transaction rejected.");
      setShowRejectForm(false);
      loadTransaction();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Rejection failed.");
    } finally {
      setIsActing(false);
    }
  };

  const handleFundEscrow = async () => {
    if (!transaction || !transaction.escrow) return;
    setIsActing(true);
    setActionError(null);
    try {
      await escrowApi.fund(transaction.escrow.id);
      setActionSuccess("Escrow funded successfully.");
      loadTransaction();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Funding failed.");
    } finally {
      setIsActing(false);
    }
  };

  const handleReleaseMilestone = async (index: number) => {
    if (!transaction || !transaction.escrow) return;
    setIsActing(true);
    setActionError(null);
    try {
      await escrowApi.releaseMilestone(transaction.escrow.id, index);
      setActionSuccess(`Milestone ${index + 1} released.`);
      loadTransaction();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Release failed.");
    } finally {
      setIsActing(false);
    }
  };

  // ── Loading / error states ───────────────────────────────────────────────────

  if (isLoading) {
    return (
      <DashboardLayout title="Transaction">
        <div className="flex flex-col items-center justify-center py-32">
          <div className="w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          <p className="mt-4 text-white/30 text-sm">
            Loading transaction details...
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !transaction) {
    return (
      <DashboardLayout title="Transaction">
        <div className="flex flex-col items-center justify-center py-32">
          <AlertCircle className="w-12 h-12 text-red-400/40 mb-4" />
          <p className="text-red-400 font-semibold mb-2">
            {error ?? "Transaction not found"}
          </p>
          <Link
            href="/transactions"
            className="text-gold hover:text-gold-light text-sm flex items-center gap-1 mt-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to transactions
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const escrow = transaction.escrow;
  const govApprovals = transaction.govApprovals ?? [];

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout title={transaction.property?.address ?? "Transaction"}>
      {/* Breadcrumb */}
      <nav className="flex items-center text-xs text-white/30 mb-6 gap-1.5">
        <Link
          href="/transactions"
          className="hover:text-gold transition-colors"
        >
          Transactions
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-white/60 font-mono">{transaction.id.slice(0, 8)}...</span>
      </nav>

      {/* Action feedback */}
      {actionSuccess && (
        <div className="mb-5 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <p className="text-emerald-400 text-sm">{actionSuccess}</p>
          <button
            onClick={() => setActionSuccess(null)}
            className="ml-auto text-emerald-400/50 hover:text-emerald-400 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}
      {actionError && (
        <div className="mb-5 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm">{actionError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column (2/3) ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Transaction header card */}
          <div className="bg-[#0d0d0d] border border-white/8 rounded-lg p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-white leading-tight mb-1">
                  {transaction.property
                    ? `${transaction.property.address}, ${transaction.property.city}`
                    : `Transaction ${transaction.id.slice(0, 8)}`}
                </h1>
                {transaction.property && (
                  <p className="text-sm text-white/40">
                    {transaction.property.state}, {transaction.property.country}
                  </p>
                )}
              </div>
              <span
                className={`flex-shrink-0 ${
                  STATUS_BADGE[transaction.status] ??
                  "badge-status bg-white/5 text-white/50 border border-white/10"
                }`}
              >
                {STATUS_LABEL[transaction.status] ?? transaction.status}
              </span>
            </div>

            {/* Sale price */}
            <div className="mb-5">
              <p className="text-xs text-white/30 uppercase tracking-wide mb-1">
                Sale Price
              </p>
              <p className="text-3xl font-black text-gold font-mono">
                {parseFloat(transaction.salePrice).toLocaleString()}
                <span className="text-sm font-normal text-white/30 ml-2">
                  {transaction.currency}
                </span>
              </p>
            </div>

            {/* Parties */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/8">
              <div>
                <p className="text-xs text-white/30 uppercase tracking-wide mb-1.5">
                  Seller
                </p>
                <p className="text-sm text-white font-medium">
                  {userName(transaction.seller)}
                </p>
                {transaction.seller?.email && (
                  <p className="text-xs text-white/40 mt-0.5">
                    {transaction.seller.email}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-white/30 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <ArrowRight className="w-3 h-3" />
                  Buyer
                </p>
                <p className="text-sm text-white font-medium">
                  {userName(transaction.buyer)}
                </p>
                {transaction.buyer?.email && (
                  <p className="text-xs text-white/40 mt-0.5">
                    {transaction.buyer.email}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Transaction timeline card */}
          <div className="bg-[#0d0d0d] border border-white/8 rounded-lg p-6">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-5">
              Transaction Lifecycle
            </h2>
            {transaction.status === "CANCELLED" && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm font-medium">
                  This transaction was cancelled.
                </p>
              </div>
            )}
            <ol className="relative">
              {TIMELINE_STEPS.map((step, i) => {
                const isCompleted =
                  currentStepIndex >= 0 && i < currentStepIndex;
                const isCurrent =
                  currentStepIndex >= 0 && i === currentStepIndex;
                const isLast = i === TIMELINE_STEPS.length - 1;

                return (
                  <li key={step.key} className="flex gap-4 pb-0">
                    <div className="flex flex-col items-center">
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5 text-gold" />
                        ) : isCurrent ? (
                          <div className="relative w-5 h-5 flex items-center justify-center">
                            <span className="absolute inset-0 rounded-full bg-gold/20 animate-ping" />
                            <span className="relative w-2.5 h-2.5 rounded-full bg-gold" />
                          </div>
                        ) : (
                          <Circle className="w-5 h-5 text-white/20" />
                        )}
                      </div>
                      {/* Connector line */}
                      {!isLast && (
                        <div
                          className={`w-px flex-1 my-1 min-h-[24px] ${
                            isCompleted ? "bg-gold/40" : "bg-white/10"
                          }`}
                        />
                      )}
                    </div>
                    <div
                      className={`pb-5 pt-0.5 ${isLast ? "pb-0" : ""}`}
                    >
                      <p
                        className={`text-sm font-medium ${
                          isCompleted
                            ? "text-gold"
                            : isCurrent
                            ? "text-white"
                            : "text-white/30"
                        }`}
                      >
                        {step.label}
                      </p>
                      {isCurrent && (
                        <p className="text-xs text-white/40 mt-0.5">
                          Current status
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Escrow section */}
          {escrow && (
            <div className="bg-[#0d0d0d] border border-white/8 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wide">
                  Escrow
                </h2>
                <span
                  className={`badge-status ${
                    escrow.status === "FUNDED"
                      ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
                      : escrow.status === "COMPLETED"
                      ? "badge-approved"
                      : escrow.status === "REFUNDED"
                      ? "badge-rejected"
                      : "badge-draft"
                  }`}
                >
                  {escrow.status}
                </span>
              </div>

              <div className="mb-4">
                <p className="text-xs text-white/30 mb-1">Total Amount</p>
                <p className="text-2xl font-bold text-gold font-mono">
                  {parseFloat(escrow.amount).toLocaleString()}
                  <span className="text-sm font-normal text-white/30 ml-1.5">
                    {transaction.currency}
                  </span>
                </p>
              </div>

              {escrow.contractAddress && (
                <div className="mb-4 p-2.5 bg-white/3 border border-white/8 rounded-lg">
                  <p className="text-xs text-white/30 mb-1">Contract Address</p>
                  <p className="text-xs font-mono text-gold/70 break-all">
                    {escrow.contractAddress}
                  </p>
                </div>
              )}

              {/* Milestones */}
              {escrow.milestones.length > 0 && (
                <div className="space-y-2 mt-4 pt-4 border-t border-white/8">
                  <p className="text-xs text-white/30 uppercase tracking-wide mb-2">
                    Milestones
                  </p>
                  {escrow.milestones.map((milestone, index) => (
                    <div
                      key={milestone.id}
                      className="flex items-center justify-between p-3 bg-white/3 border border-white/6 rounded-lg"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {milestone.released ? (
                          <CheckCircle className="w-4 h-4 text-gold flex-shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-white/30 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm text-white/80 truncate">
                            {milestone.description}
                          </p>
                          {milestone.releasedAt && (
                            <p className="text-xs text-white/30 mt-0.5">
                              Released {formatDate(milestone.releasedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className="text-gold font-mono font-semibold text-sm">
                          {parseFloat(milestone.amount).toLocaleString()}
                        </span>
                        {!milestone.released && isRegistrar && (
                          <button
                            onClick={() => handleReleaseMilestone(index)}
                            disabled={isActing}
                            className="text-xs px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-medium rounded-lg transition-colors disabled:opacity-50"
                          >
                            Release
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Fund Escrow button — buyer + status CREATED */}
              {escrow.status === "CREATED" && isBuyer && (
                <button
                  onClick={handleFundEscrow}
                  disabled={isActing}
                  className="mt-4 w-full btn-primary text-sm py-2.5 disabled:opacity-50"
                >
                  {isActing ? "Processing..." : "Fund Escrow"}
                </button>
              )}
            </div>
          )}

          {/* Government Approvals card */}
          {govApprovals.length > 0 && (
            <div className="bg-[#0d0d0d] border border-white/8 rounded-lg p-6">
              <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-4">
                Government Approvals
              </h2>
              <div className="space-y-3">
                {govApprovals.map((approval) => (
                  <div
                    key={approval.id}
                    className="p-3 bg-white/3 border border-white/6 rounded-lg"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <p className="text-sm text-white/80 font-medium">
                        {userName(approval.registrar)}
                      </p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`badge-status ${
                            GOV_ACTION_BADGE[approval.action] ?? "badge-draft"
                          }`}
                        >
                          {approval.action.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-white/30">
                          {formatDateTime(approval.createdAt)}
                        </span>
                      </div>
                    </div>
                    {approval.notes && (
                      <p className="text-xs text-white/50 mt-1 italic">
                        &ldquo;{approval.notes}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right column (1/3) ── */}
        <div className="space-y-5">
          {/* Transaction ID card */}
          <div className="bg-[#0d0d0d] border border-white/8 rounded-lg p-5">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-3">
              Transaction ID
            </h3>
            <p className="text-xs font-mono text-white/60 break-all bg-white/3 border border-white/8 px-2 py-1.5 rounded mb-3">
              {transaction.id}
            </p>
            <p className="text-xs text-white/30">
              Created {formatDate(transaction.createdAt)}
            </p>
            <p className="text-xs text-white/20 mt-0.5">
              Updated {formatDate(transaction.updatedAt)}
            </p>
          </div>

          {/* Property info card */}
          {transaction.property && (
            <div className="bg-[#0d0d0d] border border-white/8 rounded-lg p-5">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-3">
                Property
              </h3>
              <p className="text-sm text-white font-medium mb-1">
                {transaction.property.address}
              </p>
              <p className="text-xs text-white/40 mb-3">
                {transaction.property.city}, {transaction.property.state},{" "}
                {transaction.property.country}
              </p>
              <p className="text-xs font-mono text-white/30 mb-3">
                {transaction.property.titleNumber}
              </p>
              <Link
                href={`/properties/${transaction.property.id}`}
                className="flex items-center gap-1 text-xs text-gold hover:text-gold-light transition-colors"
              >
                View Property
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}

          {/* Quick Actions card */}
          <div className="bg-[#0d0d0d] border border-white/8 rounded-lg p-5 space-y-3">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-1">
              Quick Actions
            </h3>

            {/* Submit for Gov Review — seller + status ESCROW_FUNDED */}
            {isSeller && transaction.status === "ESCROW_FUNDED" && (
              <button
                onClick={handleSubmitForReview}
                disabled={isActing}
                className="w-full btn-primary text-sm py-2.5 disabled:opacity-50"
              >
                {isActing ? "Submitting..." : "Submit for Gov Review"}
              </button>
            )}

            {/* Approve Transaction — registrar + status GOV_REVIEW */}
            {isRegistrar && transaction.status === "GOV_REVIEW" && (
              <div>
                <button
                  onClick={() => {
                    setShowApproveForm((v) => !v);
                    setShowRejectForm(false);
                    setActionError(null);
                  }}
                  disabled={isActing}
                  className="w-full px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-semibold rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  Approve Transaction
                </button>
                {showApproveForm && (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={approveNotes}
                      onChange={(e) => setApproveNotes(e.target.value)}
                      placeholder="Approval notes (optional)..."
                      rows={3}
                      className="input-field text-sm py-2 resize-none"
                    />
                    <button
                      onClick={handleApprove}
                      disabled={isActing}
                      className="w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50"
                    >
                      {isActing ? "Processing..." : "Confirm Approval"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Reject Transaction — registrar + status GOV_REVIEW */}
            {isRegistrar && transaction.status === "GOV_REVIEW" && (
              <div>
                <button
                  onClick={() => {
                    setShowRejectForm((v) => !v);
                    setShowApproveForm(false);
                    setActionError(null);
                  }}
                  disabled={isActing}
                  className="w-full px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-semibold rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  Reject Transaction
                </button>
                {showRejectForm && (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={rejectNotes}
                      onChange={(e) => setRejectNotes(e.target.value)}
                      placeholder="Reason for rejection (required)..."
                      rows={3}
                      className="input-field text-sm py-2 resize-none"
                    />
                    <button
                      onClick={handleReject}
                      disabled={isActing || !rejectNotes.trim()}
                      className="w-full px-4 py-2 bg-red-500 hover:bg-red-400 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isActing ? "Processing..." : "Confirm Rejection"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* No actions available */}
            {!isSeller &&
              !isRegistrar &&
              !(isBuyer && escrow?.status === "CREATED") && (
                <p className="text-xs text-white/30 text-center py-2">
                  No actions available for your role at this stage.
                </p>
              )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
