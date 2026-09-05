"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { transactionApi, Transaction } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react";

const STATUS_TABS = [
  { label: "All", value: "" },
  { label: "Initiated", value: "INITIATED" },
  { label: "AI Review", value: "AI_REVIEW" },
  { label: "Escrow Funded", value: "ESCROW_FUNDED" },
  { label: "Gov Review", value: "GOV_REVIEW" },
  { label: "Approved", value: "APPROVED" },
  { label: "Complete", value: "TRANSFER_COMPLETE" },
  { label: "Cancelled", value: "CANCELLED" },
];

const STATUS_BADGE: Record<string, string> = {
  INITIATED: "badge-status bg-white/5 text-white/50 border border-white/10",
  AI_REVIEW: "badge-pending",
  ESCROW_FUNDED: "badge-status bg-blue-400/10 text-blue-400 border border-blue-400/20",
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function userName(
  u?: { firstName?: string; lastName?: string; email: string } | null
) {
  if (!u) return "—";
  return u.firstName ? `${u.firstName} ${u.lastName ?? ""}`.trim() : u.email;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState("");

  const fetchTransactions = (page = 1, status = activeStatus) => {
    setIsLoading(true);
    setError(null);
    transactionApi
      .list({
        page,
        limit: 20,
        ...(status ? { status } : {}),
      })
      .then((res) => {
        setTransactions(res.data);
        setPagination(res.pagination);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchTransactions(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = (value: string) => {
    setActiveStatus(value);
    fetchTransactions(1, value);
  };

  return (
    <DashboardLayout title="Transactions">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Transactions
        </h2>
        <p className="text-white/40 text-sm mt-1">
          Track all property transfers you are involved in.
        </p>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1 mb-6 bg-[#0d0d0d] border border-white/8 rounded-lg p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeStatus === tab.value
                ? "bg-gold text-black"
                : "text-white/40 hover:text-white hover:bg-white/5"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-20">
          <div className="inline-block w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          <p className="mt-4 text-white/30 text-sm">Loading transactions...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-20">
          <ArrowLeftRight className="w-16 h-16 text-white/10 mx-auto mb-4" />
          <p className="text-white/40 font-medium text-sm">
            No transactions yet
          </p>
          <p className="text-white/20 text-sm mt-1">
            Start by initiating a transfer from a property page.
          </p>
          <Link
            href="/properties"
            className="btn-primary text-sm mt-6 inline-flex"
          >
            View Properties
          </Link>
        </div>
      ) : (
        <>
          <p className="text-xs text-white/30 mb-4 tracking-wide">
            Showing {transactions.length} of {pagination.total} transactions
          </p>

          <div className="space-y-3">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="bg-[#0d0d0d] border border-white/8 rounded-lg p-5 hover:border-gold/30 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: property + parties */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={
                          STATUS_BADGE[tx.status] ??
                          "badge-status bg-white/5 text-white/50 border border-white/10"
                        }
                      >
                        {STATUS_LABEL[tx.status] ?? tx.status}
                      </span>
                    </div>
                    <p className="text-white font-semibold text-sm truncate mb-0.5">
                      {tx.property
                        ? `${tx.property.address}, ${tx.property.city}`
                        : `Transaction ${tx.id.slice(0, 8)}`}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-white/40">
                      <span>{userName(tx.seller)}</span>
                      <ArrowRight className="w-3 h-3 flex-shrink-0" />
                      <span>{userName(tx.buyer)}</span>
                    </div>
                  </div>

                  {/* Right: price + date + action */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-gold font-bold text-lg font-mono leading-none">
                        {parseFloat(tx.salePrice).toLocaleString()}
                      </p>
                      <p className="text-white/30 text-xs mt-0.5">
                        {tx.currency}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white/30 text-xs">
                        {formatDate(tx.createdAt)}
                      </span>
                      <Link
                        href={`/transactions/${tx.id}`}
                        className="btn-secondary text-xs px-3 py-1.5"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-8">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchTransactions(pagination.page - 1)}
                className="flex items-center gap-1.5 px-4 py-2 border border-white/10 rounded-lg text-sm font-medium text-white/50 hover:border-gold/30 hover:text-gold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <span className="text-xs text-white/30 font-mono">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchTransactions(pagination.page + 1)}
                className="flex items-center gap-1.5 px-4 py-2 border border-white/10 rounded-lg text-sm font-medium text-white/50 hover:border-gold/30 hover:text-gold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
