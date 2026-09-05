"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { propertyApi, Property } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import { Building2, Search, PlusSquare, ChevronLeft, ChevronRight } from "lucide-react";

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

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState({ city: "", country: "", status: "" });

  const fetchProperties = (page = 1) => {
    setIsLoading(true);
    setError(null);
    propertyApi
      .list({
        page,
        limit: 20,
        ...(search.city && { city: search.city }),
        ...(search.country && { country: search.country }),
        ...(search.status && { status: search.status }),
      })
      .then((res) => {
        setProperties(res.data);
        setPagination(res.pagination);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchProperties(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DashboardLayout title="Properties">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            My Properties
          </h2>
          <p className="text-white/40 text-sm mt-1">
            All properties registered under your account.
          </p>
        </div>
        <Link href="/properties/new" className="btn-primary text-sm px-5 py-2.5 flex items-center gap-2">
          <PlusSquare className="w-4 h-4" />
          Register Property
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-[#0d0d0d] border border-white/8 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-36">
            <label className="block text-xs font-medium text-white/40 mb-1.5 tracking-wide uppercase">
              City
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
              <input
                type="text"
                value={search.city}
                onChange={(e) =>
                  setSearch((s) => ({ ...s, city: e.target.value }))
                }
                className="input-field py-2 pl-9 text-sm"
                placeholder="Lagos, Dubai..."
              />
            </div>
          </div>
          <div className="flex-1 min-w-36">
            <label className="block text-xs font-medium text-white/40 mb-1.5 tracking-wide uppercase">
              Country
            </label>
            <input
              type="text"
              value={search.country}
              onChange={(e) =>
                setSearch((s) => ({ ...s, country: e.target.value }))
              }
              className="input-field py-2 text-sm"
              placeholder="Nigeria, UAE..."
            />
          </div>
          <div className="flex-1 min-w-36">
            <label className="block text-xs font-medium text-white/40 mb-1.5 tracking-wide uppercase">
              Status
            </label>
            <select
              value={search.status}
              onChange={(e) =>
                setSearch((s) => ({ ...s, status: e.target.value }))
              }
              className="input-field py-2 text-sm"
            >
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="APPROVED">Approved</option>
              <option value="TRANSFERRED">Transferred</option>
            </select>
          </div>
          <button
            onClick={() => fetchProperties(1)}
            className="btn-primary px-5 py-2 text-sm flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Search
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="text-center py-20">
          <div className="inline-block w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          <p className="mt-4 text-white/30 text-sm">Loading properties...</p>
        </div>
      ) : properties.length === 0 ? (
        <div className="text-center py-20">
          <Building2 className="w-16 h-16 text-white/10 mx-auto mb-4" />
          <p className="text-white/40 font-medium text-sm">No properties found</p>
          <p className="text-white/20 text-sm mt-1">
            Try adjusting your search filters or register a new property.
          </p>
          <Link href="/properties/new" className="btn-primary text-sm mt-6 inline-flex">
            Register Property
          </Link>
        </div>
      ) : (
        <>
          <p className="text-xs text-white/30 mb-4 tracking-wide">
            Showing {properties.length} of {pagination.total} properties
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.map((property) => (
              <Link
                key={property.id}
                href={`/properties/${property.id}`}
                className="bg-[#0d0d0d] border border-white/8 rounded-lg p-5 hover:border-gold/30 transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <span
                    className={`badge-status ${
                      statusColors[property.status] ?? "badge-draft"
                    }`}
                  >
                    {property.status.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-white/20 font-mono">
                    {property.titleNumber}
                  </span>
                </div>

                <h3 className="font-semibold text-white mb-1 group-hover:text-gold transition-colors line-clamp-2 text-sm">
                  {property.address}
                </h3>
                <p className="text-xs text-white/30 mb-4">
                  {property.city}, {property.state}, {property.country}
                </p>

                <div className="flex items-center justify-between text-xs border-t border-white/8 pt-3">
                  <span className="text-white/40">
                    {propertyTypeLabels[property.propertyType] ??
                      property.propertyType}
                  </span>
                  {property.estimatedValue && (
                    <span className="text-gold font-semibold">
                      ${parseFloat(property.estimatedValue).toLocaleString()}
                    </span>
                  )}
                </div>

                {property.landArea && (
                  <p className="text-xs text-white/20 mt-1.5 font-mono">
                    {property.landArea.toLocaleString()}{" "}
                    {property.landAreaUnit ?? "sqm"}
                  </p>
                )}
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-8">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchProperties(pagination.page - 1)}
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
                onClick={() => fetchProperties(pagination.page + 1)}
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
