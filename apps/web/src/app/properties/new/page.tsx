"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { propertyApi } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";

interface PropertyForm {
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  landArea: string;
  landAreaUnit: string;
  propertyType: string;
  estimatedValue: string;
}

const initialForm: PropertyForm = {
  address: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
  landArea: "",
  landAreaUnit: "sqm",
  propertyType: "RESIDENTIAL",
  estimatedValue: "",
};

const PROPERTY_TYPES = [
  { value: "RESIDENTIAL", label: "Residential" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "INDUSTRIAL", label: "Industrial" },
  { value: "AGRICULTURAL", label: "Agricultural" },
  { value: "MIXED_USE", label: "Mixed Use" },
];

const LAND_AREA_UNITS = ["sqm", "sqft", "acres", "hectares"];

export default function NewPropertyPage() {
  const router = useRouter();
  const [form, setForm] = useState<PropertyForm>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const payload = {
        address: form.address,
        city: form.city,
        state: form.state,
        country: form.country,
        ...(form.postalCode && { postalCode: form.postalCode }),
        ...(form.landArea && { landArea: parseFloat(form.landArea) }),
        ...(form.landArea && { landAreaUnit: form.landAreaUnit }),
        propertyType: form.propertyType,
        ...(form.estimatedValue && {
          estimatedValue: parseFloat(form.estimatedValue),
        }),
      };

      const res = await propertyApi.create(payload);

      if (!res.success || !res.data) {
        throw new Error(res.error ?? "Failed to register property");
      }

      router.push(`/properties/${res.data.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout title="Register Property">
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <Link
          href="/properties"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Properties
        </Link>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Register a Property</h2>
          <p className="text-slate-500 mt-1">
            Provide accurate details about the property. A unique title number
            will be generated automatically upon submission.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Property Type */}
          <div className="card p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Property Type</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PROPERTY_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, propertyType: value }))}
                  className={`px-4 py-3 rounded-lg border-2 font-medium text-sm transition-colors ${
                    form.propertyType === value
                      ? "border-primary-600 bg-primary-50 text-primary-700"
                      : "border-slate-200 text-slate-600 hover:border-primary-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="card p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Location</h3>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="address"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  required
                  value={form.address}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="12 Victoria Island Boulevard"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="city"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="city"
                    name="city"
                    type="text"
                    required
                    value={form.city}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Lagos"
                  />
                </div>
                <div>
                  <label
                    htmlFor="state"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    State / Region <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="state"
                    name="state"
                    type="text"
                    required
                    value={form.state}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Lagos State"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="country"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Country <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="country"
                    name="country"
                    type="text"
                    required
                    value={form.country}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Nigeria"
                  />
                </div>
                <div>
                  <label
                    htmlFor="postalCode"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Postal Code
                  </label>
                  <input
                    id="postalCode"
                    name="postalCode"
                    type="text"
                    value={form.postalCode}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="100001"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Property Details */}
          <div className="card p-6">
            <h3 className="font-semibold text-slate-900 mb-4">
              Property Measurements & Value
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="landArea"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Land Area
                  </label>
                  <input
                    id="landArea"
                    name="landArea"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.landArea}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="landAreaUnit"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Unit
                  </label>
                  <select
                    id="landAreaUnit"
                    name="landAreaUnit"
                    value={form.landAreaUnit}
                    onChange={handleChange}
                    className="input-field"
                  >
                    {LAND_AREA_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="estimatedValue"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Estimated Value (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                    $
                  </span>
                  <input
                    id="estimatedValue"
                    name="estimatedValue"
                    type="number"
                    min="0"
                    step="1"
                    value={form.estimatedValue}
                    onChange={handleChange}
                    className="input-field pl-8"
                    placeholder="250,000"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Info box */}
          <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
            <div className="flex gap-3">
              <svg
                className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-primary-800">
                  What happens next?
                </p>
                <p className="text-sm text-primary-700 mt-1">
                  After submission your property will be in{" "}
                  <strong>DRAFT</strong> status. Upload title deeds and
                  supporting documents, then submit for registrar review. Once
                  approved, the title will be anchored to the blockchain.
                </p>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Link href="/dashboard" className="btn-secondary">
              Cancel
            </Link>
            <button type="submit" disabled={isLoading} className="btn-primary">
              {isLoading ? "Registering..." : "Register Property"}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
