"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import {
  identityApi,
  propertyApi,
  transactionApi,
  KycRecord,
  PropertyDocument,
} from "@/lib/api";
import {
  FileText,
  ShieldCheck,
  ShieldAlert,
  Clock,
  ExternalLink,
} from "lucide-react";

// Bounds the number of per-property document fetches (list endpoints only
// return a document count, not the documents themselves — see
// apps/api/src/services/property.service.ts).
const MAX_PROPERTIES_TO_EXPAND = 12;

const KYC_STATUS_BADGE: Record<string, string> = {
  VERIFIED: "badge-approved",
  PENDING: "badge-pending",
  REJECTED: "badge-rejected",
};

interface DocRow extends PropertyDocument {
  propertyAddress: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function DocumentsPage() {
  const { user } = useAuth();

  const [kyc, setKyc] = useState<KycRecord | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    async function load() {
      try {
        const kycRes = await identityApi.getKycStatus();
        if (!cancelled && kycRes.success && kycRes.data) {
          setKyc(kycRes.data.latestRecord);
        }

        // Which properties' documents are relevant depends on role: a
        // seller's own listings, a buyer's properties-in-progress (via their
        // transactions), or — for oversight roles — everything.
        let propertyIds: { id: string; address: string }[] = [];

        if (user!.role === "SELLER") {
          const res = await propertyApi.list({ ownerId: user!.id, limit: MAX_PROPERTIES_TO_EXPAND });
          propertyIds = res.data.map((p) => ({ id: p.id, address: `${p.address}, ${p.city}` }));
        } else if (user!.role === "BUYER") {
          const res = await transactionApi.list({ limit: MAX_PROPERTIES_TO_EXPAND });
          const seen = new Set<string>();
          for (const tx of res.data) {
            if (tx.property && !seen.has(tx.property.id)) {
              seen.add(tx.property.id);
              propertyIds.push({
                id: tx.property.id,
                address: `${tx.property.address}, ${tx.property.city}`,
              });
            }
          }
        } else {
          // REGISTRAR / ADMIN — platform-wide oversight view.
          const res = await propertyApi.list({ limit: MAX_PROPERTIES_TO_EXPAND });
          propertyIds = res.data.map((p) => ({ id: p.id, address: `${p.address}, ${p.city}` }));
        }

        const details = await Promise.all(
          propertyIds.map((p) =>
            propertyApi
              .getById(p.id)
              .then((res) => ({ property: p, documents: res.data?.documents ?? [] }))
              .catch(() => ({ property: p, documents: [] as PropertyDocument[] }))
          )
        );

        if (cancelled) return;

        const rows: DocRow[] = details.flatMap(({ property, documents }) =>
          documents.map((d) => ({ ...d, propertyAddress: property.address }))
        );
        rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setDocs(rows);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load documents.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <DashboardLayout title="Documents">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white tracking-tight">Documents</h2>
        <p className="text-white/40 text-sm mt-1">
          Identity verification and property records tied to your account.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Identity documents */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-white/40 mb-3 tracking-widest uppercase">
          Identity Verification
        </h3>
        {kyc ? (
          <div className="bg-[#0d0d0d] border border-white/8 rounded-lg p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
                {kyc.status === "VERIFIED" ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                ) : kyc.status === "REJECTED" ? (
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {kyc.documentType.replace(/_/g, " ")}
                </p>
                <p className="text-white/30 text-xs mt-0.5">
                  Submitted {formatDate(kyc.createdAt)}
                  {kyc.verifiedAt && ` · Verified ${formatDate(kyc.verifiedAt)}`}
                </p>
              </div>
            </div>
            <span
              className={
                KYC_STATUS_BADGE[kyc.status] ??
                "badge-status bg-white/5 text-white/50 border border-white/10"
              }
            >
              {kyc.status}
            </span>
          </div>
        ) : (
          <div className="bg-[#0d0d0d] border border-white/8 rounded-lg p-5 flex items-center justify-between gap-4">
            <p className="text-white/40 text-sm">No identity document submitted yet.</p>
            <Link href="/dashboard/kyc" className="btn-secondary text-xs px-3 py-1.5">
              Submit KYC
            </Link>
          </div>
        )}
      </div>

      {/* Property documents */}
      <div>
        <h3 className="text-sm font-semibold text-white/40 mb-3 tracking-widest uppercase">
          Property Documents
        </h3>

        {isLoading ? (
          <div className="text-center py-16">
            <div className="inline-block w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            <p className="mt-4 text-white/30 text-sm">Loading documents...</p>
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-16 bg-[#0d0d0d] border border-white/8 rounded-lg">
            <FileText className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/40 font-medium text-sm">No property documents yet</p>
            <p className="text-white/20 text-sm mt-1">
              Documents uploaded during property registration will appear here.
            </p>
          </div>
        ) : (
          <div className="bg-[#0d0d0d] border border-white/8 rounded-lg divide-y divide-white/5">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-4 px-5 py-3.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-white/20 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {doc.fileName}
                    </p>
                    <p className="text-white/30 text-xs mt-0.5 truncate">
                      {doc.documentType.replace(/_/g, " ")} &middot;{" "}
                      {doc.propertyAddress} &middot; {formatDate(doc.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {doc.aiVerified ? (
                    <span className="badge-approved">AI Verified</span>
                  ) : (
                    <span className="badge-status bg-white/5 text-white/40 border border-white/10">
                      Unverified
                    </span>
                  )}
                  {doc.fraudScore != null && Number(doc.fraudScore) > 0.5 && (
                    <span className="badge-rejected">Flagged</span>
                  )}
                  {doc.storageUrl && (
                    <a
                      href={doc.storageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/20 hover:text-gold transition-colors"
                      title="Open document"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
