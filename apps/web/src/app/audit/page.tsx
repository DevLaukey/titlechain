"use client";

import DashboardLayout from "@/components/DashboardLayout";

// ── Mock data ─────────────────────────────────────────────────────────────────

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  entityType: string;
  description: string;
  actor: string;
}

const MOCK_AUDIT_LOG: AuditEntry[] = [
  {
    id: "10",
    timestamp: "2026-07-04T11:30:00Z",
    action: "TRANSACTION_COMPLETED",
    entityType: "Transaction",
    description:
      "Property title successfully transferred to buyer — on-chain record updated.",
    actor: "System",
  },
  {
    id: "9",
    timestamp: "2026-07-04T11:15:00Z",
    action: "ESCROW_MILESTONE_RELEASED",
    entityType: "Escrow",
    description:
      "First milestone (deposit, ₦9M) released to seller after buyer confirmation.",
    actor: "Registrar Emeka Nwosu",
  },
  {
    id: "8",
    timestamp: "2026-07-04T11:00:00Z",
    action: "GOV_APPROVED",
    entityType: "Gov Approval",
    description:
      "Transaction approved by Land Registry — title transfer authorised.",
    actor: "Registrar Emeka Nwosu",
  },
  {
    id: "7",
    timestamp: "2026-07-04T10:30:00Z",
    action: "BLOCKCHAIN_TX_CONFIRMED",
    entityType: "Blockchain",
    description:
      "Title deed metadata anchored on Ethereum Sepolia testnet (block 7812044).",
    actor: "System",
  },
  {
    id: "6",
    timestamp: "2026-07-04T10:15:00Z",
    action: "USER_KYC_VERIFIED",
    entityType: "User",
    description:
      "KYC verification completed for buyer Chinwe Obiageli — documents validated.",
    actor: "Registrar Emeka Nwosu",
  },
  {
    id: "5",
    timestamp: "2026-07-04T10:00:00Z",
    action: "GOV_REVIEW_INITIATED",
    entityType: "Gov Review",
    description:
      "Transaction submitted for government review after escrow funding confirmed.",
    actor: "Adebayo Okafor",
  },
  {
    id: "4",
    timestamp: "2026-07-04T09:45:00Z",
    action: "PROPERTY_STATUS_CHANGED",
    entityType: "Property",
    description:
      "Property #TC-2026-00142 status updated from APPROVED to PENDING_TRANSFER.",
    actor: "System",
  },
  {
    id: "3",
    timestamp: "2026-07-04T09:30:00Z",
    action: "DOCUMENT_UPLOADED",
    entityType: "Document",
    description:
      "Title deed PDF uploaded — IPFS hash anchored and AI verification queued.",
    actor: "Adebayo Okafor",
  },
  {
    id: "2",
    timestamp: "2026-07-04T09:20:00Z",
    action: "ESCROW_CREATED",
    entityType: "Escrow",
    description:
      "Smart contract escrow deployed for ₦45M transaction with 3 release milestones.",
    actor: "System",
  },
  {
    id: "1",
    timestamp: "2026-07-04T09:15:00Z",
    action: "TRANSACTION_CREATED",
    entityType: "Transaction",
    description:
      "Property transfer initiated for 14 Abiodun Close, Lagos Island by seller.",
    actor: "Adebayo Okafor",
  },
];

// ── Color mapping ─────────────────────────────────────────────────────────────

function getActionClasses(action: string): string {
  if (action.startsWith("USER_"))
    return "bg-blue-400/10 text-blue-400 border border-blue-400/20";
  if (action.startsWith("PROPERTY_"))
    return "bg-amber-400/10 text-amber-400 border border-amber-400/20";
  if (action.startsWith("DOCUMENT_"))
    return "bg-purple-400/10 text-purple-400 border border-purple-400/20";
  if (action.startsWith("TRANSACTION_"))
    return "bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20";
  if (action.startsWith("ESCROW_"))
    return "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20";
  if (action.startsWith("GOV_"))
    return "bg-red-400/10 text-red-400 border border-red-400/20";
  if (action.startsWith("BLOCKCHAIN_"))
    return "bg-cyan-400/10 text-cyan-400 border border-cyan-400/20";
  return "bg-white/5 text-white/50 border border-white/10";
}

function getEntityClasses(entityType: string): string {
  const map: Record<string, string> = {
    Transaction: "text-[#D4AF37]",
    Escrow: "text-emerald-400",
    "Gov Approval": "text-red-400",
    "Gov Review": "text-red-400",
    Blockchain: "text-cyan-400",
    User: "text-blue-400",
    Property: "text-amber-400",
    Document: "text-purple-400",
  };
  return map[entityType] ?? "text-white/40";
}

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AuditPage() {
  return (
    <DashboardLayout title="Audit Log">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Audit Log
          </h2>
          <p className="text-white/40 text-sm mt-1">
            Immutable record of all platform actions
          </p>
        </div>
        <span className="flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-400/10 text-amber-400 border border-amber-400/20">
          Demo data
        </span>
      </div>

      {/* Legend */}
      <div className="bg-[#0d0d0d] border border-white/8 rounded-lg p-4 mb-6">
        <p className="text-xs text-white/30 uppercase tracking-wide mb-2 font-medium">
          Action categories
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { prefix: "USER_", label: "User", cls: "bg-blue-400/10 text-blue-400 border-blue-400/20" },
            { prefix: "PROPERTY_", label: "Property", cls: "bg-amber-400/10 text-amber-400 border-amber-400/20" },
            { prefix: "DOCUMENT_", label: "Document", cls: "bg-purple-400/10 text-purple-400 border-purple-400/20" },
            { prefix: "TRANSACTION_", label: "Transaction", cls: "bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20" },
            { prefix: "ESCROW_", label: "Escrow", cls: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20" },
            { prefix: "GOV_", label: "Government", cls: "bg-red-400/10 text-red-400 border-red-400/20" },
            { prefix: "BLOCKCHAIN_", label: "Blockchain", cls: "bg-cyan-400/10 text-cyan-400 border-cyan-400/20" },
          ].map(({ label, cls }) => (
            <span
              key={label}
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Audit log entries */}
      <div className="bg-[#0d0d0d] border border-white/8 rounded-lg overflow-hidden">
        <div className="divide-y divide-white/6">
          {MOCK_AUDIT_LOG.map((entry, index) => (
            <div
              key={entry.id}
              className={`p-4 hover:bg-white/3 transition-colors ${
                index === 0 ? "bg-white/3" : ""
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                {/* Timestamp */}
                <div className="flex-shrink-0 sm:w-44">
                  <p className="text-xs font-mono text-white/30 leading-relaxed">
                    {formatTimestamp(entry.timestamp)}
                  </p>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 flex-shrink-0 sm:w-56">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getActionClasses(
                      entry.action
                    )}`}
                  >
                    {entry.action.replace(/_/g, " ")}
                  </span>
                  <span
                    className={`text-xs font-medium ${getEntityClasses(
                      entry.entityType
                    )}`}
                  >
                    {entry.entityType}
                  </span>
                </div>

                {/* Description + actor */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 leading-relaxed">
                    {entry.description}
                  </p>
                  <p className="text-xs text-white/30 mt-1">
                    by{" "}
                    <span className="text-white/50 font-medium">
                      {entry.actor}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="px-4 py-3 border-t border-white/8 bg-[#111111]">
          <p className="text-xs text-white/20 text-center">
            Demo data — live audit API integration pending.
            Entries shown in reverse chronological order.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
