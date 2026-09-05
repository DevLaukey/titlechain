"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { propertyApi, Property } from "@/lib/api";
import {
  Building2,
  ArrowLeftRight,
  Clock,
  FileCheck,
  PlusSquare,
  ExternalLink,
  ClipboardList,
} from "lucide-react";

function StatCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-[#0d0d0d] border border-white/8 rounded-lg p-5 hover:border-gold/20 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-white/40 tracking-wide uppercase">
          {label}
        </p>
        <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
          <Icon className="w-4 h-4 text-gold" />
        </div>
      </div>
      <p className="text-3xl font-extrabold text-gold mb-1">{value}</p>
      {description && (
        <p className="text-xs text-white/30">{description}</p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [myProperties, setMyProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    propertyApi
      .list({ limit: 5, ownerId: user.id })
      .then((res) => setMyProperties(res.data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [user]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const displayName =
    user?.firstName ?? user?.email?.split("@")[0] ?? "there";

  return (
    <DashboardLayout title="Overview">
      {/* Welcome banner */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white tracking-tight">
          {greeting()},{" "}
          <span className="text-gold">{displayName}</span>
        </h2>
        <p className="text-white/40 mt-1 text-sm">
          Here&apos;s a summary of your TitleChain account.
        </p>
      </div>

      {/* KYC alert */}
      {user?.kycStatus !== "VERIFIED" && (
        <div className="mb-8 p-4 bg-amber-400/5 border border-amber-400/20 rounded-lg flex items-start gap-4">
          <div className="w-8 h-8 bg-amber-400/10 rounded-full flex items-center justify-center flex-shrink-0">
            <svg
              className="w-4 h-4 text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-amber-400 text-sm">
              Identity verification required
            </p>
            <p className="text-amber-400/60 text-sm mt-0.5">
              Submit your KYC documents to participate in property transactions.
              Current status:{" "}
              <strong className="text-amber-400">{user?.kycStatus ?? "PENDING"}</strong>.
            </p>
          </div>
          <Link
            href="/dashboard/kyc"
            className="flex-shrink-0 text-xs font-medium text-amber-400 hover:text-amber-300 border border-amber-400/30 rounded px-3 py-1.5 transition-colors"
          >
            Submit KYC
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Properties"
          value={isLoading ? "—" : myProperties.length}
          description="Registered on TitleChain"
          icon={Building2}
        />
        <StatCard
          label="Active Transactions"
          value="0"
          description="Pending completion"
          icon={ArrowLeftRight}
        />
        <StatCard
          label="Pending Approvals"
          value={
            isLoading
              ? "—"
              : myProperties.filter((p) => p.status === "PENDING_REVIEW")
                  .length
          }
          description="Awaiting registrar review"
          icon={Clock}
        />
        <StatCard
          label="Verified Documents"
          value={
            isLoading
              ? "—"
              : myProperties.filter((p) => p.status === "APPROVED").length
          }
          description="Approved properties"
          icon={FileCheck}
        />
      </div>

      {/* Recent properties */}
      <div className="bg-[#0d0d0d] border border-white/8 rounded-lg mb-6">
        <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
          <h3 className="font-semibold text-white text-sm tracking-wide">
            Recent Properties
          </h3>
          <Link
            href="/properties/new"
            className="text-xs text-gold hover:text-gold-light font-medium flex items-center gap-1 transition-colors"
          >
            <PlusSquare className="w-3 h-3" />
            Register New
          </Link>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-white/30">
            <div className="inline-block w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            <p className="mt-3 text-sm">Loading your properties...</p>
          </div>
        ) : myProperties.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/40 font-medium mb-2 text-sm">
              No properties yet
            </p>
            <p className="text-white/20 text-sm mb-6">
              Register your first property to get started with secure title
              management.
            </p>
            <Link href="/properties/new" className="btn-primary text-sm">
              Register a Property
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {myProperties.map((property) => (
              <li key={property.id}>
                <Link
                  href={`/properties/${property.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors group"
                >
                  <div>
                    <p className="font-medium text-white text-sm group-hover:text-gold transition-colors">
                      {property.address}
                    </p>
                    <p className="text-xs text-white/30 mt-0.5 font-mono">
                      {property.city}, {property.state} &middot;{" "}
                      {property.titleNumber}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`badge-status ${
                        property.status === "APPROVED"
                          ? "badge-approved"
                          : property.status === "PENDING_REVIEW"
                          ? "badge-pending"
                          : property.status === "REJECTED"
                          ? "badge-rejected"
                          : property.status === "TRANSFERRED"
                          ? "badge-transferred"
                          : "badge-draft"
                      }`}
                    >
                      {property.status.replace(/_/g, " ")}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-white/20 group-hover:text-gold transition-colors" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-semibold text-white/40 mb-3 tracking-widest uppercase">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/properties/new"
            className="flex items-center gap-3 p-4 bg-[#0d0d0d] border border-white/8 rounded-lg hover:border-gold/30 hover:bg-gold/5 transition-colors group"
          >
            <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
              <PlusSquare className="w-4 h-4 text-gold" />
            </div>
            <div>
              <p className="text-white text-sm font-medium group-hover:text-gold transition-colors">
                Register Property
              </p>
              <p className="text-white/30 text-xs">Add a new property</p>
            </div>
          </Link>

          <Link
            href="/transactions"
            className="flex items-center gap-3 p-4 bg-[#0d0d0d] border border-white/8 rounded-lg hover:border-gold/30 hover:bg-gold/5 transition-colors group"
          >
            <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
              <ArrowLeftRight className="w-4 h-4 text-gold" />
            </div>
            <div>
              <p className="text-white text-sm font-medium group-hover:text-gold transition-colors">
                Start Transaction
              </p>
              <p className="text-white/30 text-xs">Initiate a transfer</p>
            </div>
          </Link>

          <Link
            href="/audit"
            className="flex items-center gap-3 p-4 bg-[#0d0d0d] border border-white/8 rounded-lg hover:border-gold/30 hover:bg-gold/5 transition-colors group"
          >
            <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
              <ClipboardList className="w-4 h-4 text-gold" />
            </div>
            <div>
              <p className="text-white text-sm font-medium group-hover:text-gold transition-colors">
                View Audit Log
              </p>
              <p className="text-white/30 text-xs">Full activity trail</p>
            </div>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
