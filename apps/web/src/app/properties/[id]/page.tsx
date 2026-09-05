"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { propertyApi, Property } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Building2,
  ArrowLeft,
  ShieldCheck,
  ExternalLink,
  FileText,
  AlertCircle,
  Clock,
  ChevronRight,
} from "lucide-react";

const statusColors: Record<string, string> = {
  DRAFT: "badge-draft",
  PENDING_REVIEW: "badge-pending",
  APPROVED: "badge-approved",
  REJECTED: "badge-rejected",
  TRANSFERRED: "badge-transferred",
};

const propertyTypeLabels: Record<string, string> = {
  RESIDENTIAL: "Residential",
  COMMERCIAL: "Commercial",
  INDUSTRIAL: "Industrial",
  AGRICULTURAL: "Agricultural",
  MIXED_USE: "Mixed Use",
};

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-start py-3 border-b border-white/8 last:border-0 gap-1 sm:gap-4">
      <dt className="w-44 text-xs font-medium text-white/40 uppercase tracking-wide flex-shrink-0 pt-0.5">
        {label}
      </dt>
      <dd
        className={`text-sm text-white/80 break-all ${mono ? "font-mono text-xs text-white/60 bg-white/5 px-2 py-1 rounded" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

export default function PropertyDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : (params.id?.[0] ?? "");

  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    propertyApi
      .getById(id)
      .then((res) => {
        if (res.success && res.data) {
          setProperty(res.data);
        } else {
          setError("Property not found.");
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <DashboardLayout title="Property">
        <div className="flex flex-col items-center justify-center py-32">
          <div className="w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          <p className="mt-4 text-white/30 text-sm">Loading property details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !property) {
    return (
      <DashboardLayout title="Property">
        <div className="flex flex-col items-center justify-center py-32">
          <AlertCircle className="w-12 h-12 text-red-400/40 mb-4" />
          <p className="text-red-400 font-semibold mb-2">{error ?? "Property not found"}</p>
          <Link href="/properties" className="text-gold hover:text-gold-light text-sm flex items-center gap-1 mt-2">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to properties
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={property.address}>
      {/* Breadcrumb */}
      <nav className="flex items-center text-xs text-white/30 mb-6 gap-1.5">
        <Link href="/properties" className="hover:text-gold transition-colors">
          Properties
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-white/60 font-mono">{property.titleNumber}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Header card */}
          <div className="bg-[#0d0d0d] border border-white/8 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4 gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-white mb-1 leading-tight">
                  {property.address}
                </h1>
                <p className="text-sm text-white/40">
                  {property.city}, {property.state}, {property.country}
                  {property.postalCode && `, ${property.postalCode}`}
                </p>
              </div>
              <span className={`badge-status flex-shrink-0 ${statusColors[property.status] ?? "badge-draft"}`}>
                {property.status.replace(/_/g, " ")}
              </span>
            </div>

            {property.estimatedValue && (
              <div className="mb-5">
                <p className="text-xs text-white/30 uppercase tracking-wide mb-1">Estimated Value</p>
                <p className="text-3xl font-black text-gold">
                  ${parseFloat(property.estimatedValue).toLocaleString()}
                  <span className="text-sm font-normal text-white/30 ml-2">USD</span>
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/8 rounded-full text-xs text-white/60">
                <Building2 className="w-3 h-3" />
                {propertyTypeLabels[property.propertyType] ?? property.propertyType}
              </span>
              {property.landArea && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/8 rounded-full text-xs text-white/60">
                  {property.landArea.toLocaleString()} {property.landAreaUnit ?? "sqm"}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/8 rounded-full text-xs font-mono text-white/40">
                {property.titleNumber}
              </span>
            </div>
          </div>

          {/* Property details */}
          <div className="bg-[#0d0d0d] border border-white/8 rounded-lg p-6">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide mb-4">
              Property Details
            </h2>
            <dl>
              <InfoRow label="Title Number" value={property.titleNumber} mono />
              <InfoRow label="Property Type" value={propertyTypeLabels[property.propertyType] ?? property.propertyType} />
              <InfoRow label="Address" value={property.address} />
              <InfoRow label="City" value={property.city} />
              <InfoRow label="State / Region" value={property.state} />
              <InfoRow label="Country" value={property.country} />
              <InfoRow label="Postal Code" value={property.postalCode} />
              <InfoRow
                label="Land Area"
                value={
                  property.landArea
                    ? `${property.landArea.toLocaleString()} ${property.landAreaUnit ?? "sqm"}`
                    : null
                }
              />
              <InfoRow
                label="Est. Value"
                value={
                  property.estimatedValue
                    ? `$${parseFloat(property.estimatedValue).toLocaleString()} USD`
                    : null
                }
              />
              <InfoRow
                label="Registered"
                value={new Date(property.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              />
            </dl>
          </div>

          {/* Documents */}
          {property.documents && property.documents.length > 0 && (
            <div className="bg-[#0d0d0d] border border-white/8 rounded-lg p-6">
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide mb-4">
                Documents ({property.documents.length})
              </h2>
              <div className="space-y-2">
                {property.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-white/3 border border-white/6 rounded-lg"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-gold/60 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-white/80 truncate">{doc.fileName}</p>
                        <p className="text-xs text-white/30 font-mono truncate">{doc.ipfsHash}</p>
                      </div>
                    </div>
                    <span
                      className={`ml-3 flex-shrink-0 badge-status ${
                        doc.aiVerified ? "badge-approved" : "badge-pending"
                      }`}
                    >
                      {doc.aiVerified ? "Verified" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right column ── */}
        <div className="space-y-5">
          {/* Owner */}
          {property.owner && (
            <div className="bg-[#0d0d0d] border border-white/8 rounded-lg p-5">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-3">
                Current Owner
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gold/10 border border-gold/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-gold font-bold text-sm">
                    {property.owner.firstName?.[0] ??
                      property.owner.email?.[0]?.toUpperCase() ??
                      "?"}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-white text-sm truncate">
                    {property.owner.firstName && property.owner.lastName
                      ? `${property.owner.firstName} ${property.owner.lastName}`
                      : property.owner.email}
                  </p>
                  {property.owner.firstName && (
                    <p className="text-xs text-white/30 truncate">{property.owner.email}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Blockchain record */}
          <div className="bg-[#0d0d0d] border border-white/8 rounded-lg p-5">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Blockchain Record
            </h3>
            {property.blockchainTxHash ? (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-white/30 mb-1">On-Chain ID</p>
                  <p className="text-xs font-mono text-gold/70 break-all bg-gold/5 border border-gold/10 px-2 py-1.5 rounded">
                    {property.onChainId}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/30 mb-1">Transaction Hash</p>
                  <p className="text-xs font-mono text-white/50 break-all bg-white/3 border border-white/8 px-2 py-1.5 rounded">
                    {property.blockchainTxHash}
                  </p>
                </div>
                <a
                  href={`https://sepolia.basescan.org/tx/${property.blockchainTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-gold hover:text-gold-light transition-colors mt-2"
                >
                  View on Etherscan
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : (
              <div className="text-center py-5">
                <Clock className="w-7 h-7 text-white/10 mx-auto mb-2" />
                <p className="text-sm text-white/30">Not yet anchored on-chain</p>
                <p className="text-xs text-white/20 mt-1">Awaiting registrar approval</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="bg-[#0d0d0d] border border-white/8 rounded-lg p-5 space-y-2.5">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-3">
              Actions
            </h3>
            <Link
              href={`/properties/${property.id}/edit`}
              className="btn-secondary w-full text-sm py-2.5"
            >
              Edit Property
            </Link>
            <button className="w-full px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-semibold rounded-lg text-sm transition-colors">
              Initiate Transfer
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
