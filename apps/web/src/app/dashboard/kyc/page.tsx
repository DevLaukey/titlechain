"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, ShieldAlert, Clock, Upload } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/lib/auth";
import {
  identityApi,
  ApiError,
  KycStatusData,
  KycDocumentType,
} from "@/lib/api";

const DOCUMENT_TYPES: { value: KycDocumentType; label: string }[] = [
  { value: "NATIONAL_ID", label: "National ID" },
  { value: "PASSPORT", label: "Passport" },
  { value: "DRIVERS_LICENSE", label: "Driver's License" },
  { value: "UTILITY_BILL", label: "Utility Bill" },
  { value: "BANK_STATEMENT", label: "Bank Statement" },
];

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function KycPage() {
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<KycStatusData | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  const [documentType, setDocumentType] =
    useState<KycDocumentType>("NATIONAL_ID");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const loadStatus = () => {
    setIsLoadingStatus(true);
    identityApi
      .getKycStatus()
      .then((res) => {
        if (res.success && res.data) setStatus(res.data);
      })
      .catch(() => {})
      .finally(() => setIsLoadingStatus(false));
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFileError(null);
    setFile(null);

    if (!selected) return;

    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setFileError("Invalid file type. Allowed types: PDF, JPG, PNG, WebP");
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setFileError("File size exceeds the 10 MB limit");
      return;
    }
    setFile(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!file) {
      setFileError("Please select a document to upload");
      return;
    }

    setIsSubmitting(true);
    try {
      const documentHash = await hashFile(file);
      const res = await identityApi.submitKyc({ documentType, documentHash });

      if (!res.success) {
        throw new Error(res.error ?? "Failed to submit KYC documents");
      }

      setSubmitted(true);
      await refreshUser();
      loadStatus();
    } catch (err) {
      setSubmitError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const latestRecord = status?.latestRecord ?? null;
  const isVerified = status?.kycStatus === "VERIFIED";
  const isUnderReview = !isVerified && latestRecord?.status === "PENDING";
  const wasRejected = latestRecord?.status === "REJECTED";
  const showForm = !isLoadingStatus && !submitted && !isVerified && !isUnderReview;

  return (
    <DashboardLayout title="Identity Verification">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Identity Verification (KYC)
          </h2>
          <p className="text-white/40 mt-1 text-sm">
            Verified identity is required before you can initiate or
            participate in a property transaction.
          </p>
        </div>

        {isLoadingStatus && (
          <div className="p-12 text-center text-white/30">
            <div className="inline-block w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            <p className="mt-3 text-sm">Checking your verification status...</p>
          </div>
        )}

        {!isLoadingStatus && !submitted && isVerified && (
          <div className="bg-[#0d0d0d] border border-emerald-400/20 rounded-lg p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-white font-semibold mb-1">Identity Verified</p>
            <p className="text-white/40 text-sm mb-6">
              Your identity has been verified. You can now participate in
              property transactions.
            </p>
            <Link href="/dashboard" className="btn-secondary text-sm">
              Back to Dashboard
            </Link>
          </div>
        )}

        {!isLoadingStatus && !submitted && isUnderReview && (
          <div className="bg-[#0d0d0d] border border-amber-400/20 rounded-lg p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-6 h-6 text-amber-400" />
            </div>
            <p className="text-white font-semibold mb-1">Review In Progress</p>
            <p className="text-white/40 text-sm mb-1">
              Your{" "}
              <span className="text-white/70">
                {DOCUMENT_TYPES.find((d) => d.value === latestRecord?.documentType)
                  ?.label ?? latestRecord?.documentType}
              </span>{" "}
              submission is pending registrar review.
            </p>
            <p className="text-white/20 text-xs mb-6">
              Submitted{" "}
              {latestRecord?.createdAt
                ? new Date(latestRecord.createdAt).toLocaleString()
                : ""}
            </p>
            <Link href="/dashboard" className="btn-secondary text-sm">
              Back to Dashboard
            </Link>
          </div>
        )}

        {submitted && (
          <div className="bg-[#0d0d0d] border border-emerald-400/20 rounded-lg p-8 text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-white font-semibold mb-1">
              Documents Submitted
            </p>
            <p className="text-white/40 text-sm">
              Your identity is now pending registrar review.
            </p>
          </div>
        )}

        {showForm && !submitted && (
          <>
            {wasRejected && (
              <div className="mb-6 p-4 bg-red-400/5 border border-red-400/20 rounded-lg flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 text-sm font-medium">
                    Your previous submission was rejected
                  </p>
                  {latestRecord?.notes && (
                    <p className="text-red-400/60 text-sm mt-1">
                      {latestRecord.notes}
                    </p>
                  )}
                  <p className="text-red-400/60 text-sm mt-1">
                    Please review the details below and submit again.
                  </p>
                </div>
              </div>
            )}

            {submitError && (
              <div className="mb-6 p-4 bg-red-400/5 border border-red-400/20 rounded-lg">
                <p className="text-red-400 text-sm">{submitError}</p>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="bg-[#0d0d0d] border border-white/8 rounded-lg p-8 space-y-6"
            >
              <div>
                <label className="block text-xs font-medium text-white/50 mb-2 tracking-wide uppercase">
                  Document Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {DOCUMENT_TYPES.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDocumentType(value)}
                      className={`px-3 py-3 rounded-lg border-2 font-semibold text-xs transition-colors ${
                        documentType === value
                          ? "border-gold bg-gold/10 text-gold"
                          : "border-white/10 text-white/40 hover:border-gold/30 hover:text-white/60"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="document"
                  className="block text-xs font-medium text-white/50 mb-2 tracking-wide uppercase"
                >
                  Document File
                </label>
                <label
                  htmlFor="document"
                  className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/10 hover:border-gold/30 rounded-lg py-8 px-4 cursor-pointer transition-colors"
                >
                  <Upload className="w-5 h-5 text-white/30" />
                  <span className="text-sm text-white/50">
                    {file ? file.name : "Click to select a file"}
                  </span>
                  <span className="text-xs text-white/20">
                    PDF, JPG, PNG, or WebP — up to 10 MB
                  </span>
                  <input
                    id="document"
                    type="file"
                    accept={ACCEPTED_TYPES.join(",")}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {fileError && (
                  <p className="text-red-400 text-xs mt-2">{fileError}</p>
                )}
                <p className="text-white/20 text-xs mt-2">
                  Your document is hashed locally in your browser — only the
                  cryptographic hash is submitted for tamper-evident
                  verification, not the file itself.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Link href="/dashboard" className="btn-secondary text-sm">
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting || !file}
                  className="btn-primary text-sm"
                >
                  {isSubmitting ? "Submitting..." : "Submit for Verification"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
