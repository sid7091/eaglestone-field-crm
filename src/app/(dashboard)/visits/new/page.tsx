"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { api } from "@/lib/api-client";

interface CustomerOption {
  id: string;
  businessName: string;
  regionCode: string;
  city: string | null;
  district: string;
}

interface CustomerSearchResponse {
  data: CustomerOption[];
}

const VISIT_PURPOSES = [
  { value: "SALES_PITCH", label: "Sales Pitch" },
  { value: "SAMPLE_DELIVERY", label: "Sample Delivery" },
  { value: "ORDER_FOLLOWUP", label: "Order Follow-up" },
  { value: "COMPLAINT_RESOLUTION", label: "Complaint Resolution" },
  { value: "PAYMENT_COLLECTION", label: "Payment Collection" },
  { value: "RELATIONSHIP_BUILDING", label: "Relationship Building" },
  { value: "SITE_SURVEY", label: "Site Survey" },
] as const;

const REGION_CODES = [
  "AP", "AR", "AS", "BR", "CG", "GA", "GJ", "HR", "HP", "JH",
  "KA", "KL", "MP", "MH", "MN", "ML", "MZ", "NL", "OD", "PB",
  "RJ", "SK", "TN", "TG", "TR", "UP", "UK", "WB", "DL", "JK",
] as const;

const INPUT_CLS =
  "w-full rounded-sm border border-brand-brown/20 px-4 py-2 text-sm text-brand-brown bg-white focus:border-brand-tan focus:outline-none focus:ring-1 focus:ring-brand-tan/20";

const LABEL_CLS =
  "mb-1.5 block font-display text-[11px] font-semibold tracking-[.12em] text-brand-olive/50 uppercase";

export default function NewVisitPage() {
  const router = useRouter();

  const [customerQuery, setCustomerQuery] = useState("");
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 10));
  const [purpose, setPurpose] = useState<string>("SALES_PITCH");
  const [regionCode, setRegionCode] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (selectedCustomer) setRegionCode(selectedCustomer.regionCode);
  }, [selectedCustomer]);

  const searchCustomers = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setCustomerOptions([]); return; }
    setSearchLoading(true);
    try {
      const params = new URLSearchParams({ search: q, limit: "10" });
      const res = await api.get<CustomerSearchResponse>(`/customers?${params.toString()}`);
      setCustomerOptions(res.data);
    } catch {
      setCustomerOptions([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!selectedCustomer) {
        searchCustomers(customerQuery);
        setDropdownOpen(customerQuery.length >= 2);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerQuery, selectedCustomer, searchCustomers]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCustomer = (c: CustomerOption) => {
    setSelectedCustomer(c);
    setCustomerQuery(c.businessName);
    setDropdownOpen(false);
  };

  const handleCustomerInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerQuery(e.target.value);
    if (selectedCustomer) { setSelectedCustomer(null); setRegionCode(""); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    if (!selectedCustomer) { setSubmitError("Please select a customer from the dropdown."); return; }
    if (!regionCode) { setSubmitError("Region code is required."); return; }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { customerId: selectedCustomer.id, visitDate, purpose, regionCode };
      if (notes.trim()) body.notes = notes.trim();
      if (nextSteps.trim()) body.nextSteps = nextSteps.trim();
      if (followUpDate) body.followUpDate = followUpDate;
      await api.post("/visits", body);
      router.push("/visits");
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create visit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/visits"
          className="rounded-sm p-1.5 text-brand-olive/40 hover:bg-brand-brown/5 hover:text-brand-olive"
          aria-label="Back to visits"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div>
          <h1 className="font-display text-[28px] font-bold leading-tight text-brand-brown">Plan a Visit</h1>
          <p className="text-sm text-brand-olive/60">Schedule a new field visit for today or a future date</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <h2 className="font-display text-[15px] font-bold text-brand-brown">Visit Details</h2>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Customer selector */}
            <div className="relative" ref={dropdownRef}>
              <label className={LABEL_CLS}>
                Customer <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={customerQuery}
                onChange={handleCustomerInputChange}
                onFocus={() => { if (customerOptions.length > 0 && !selectedCustomer) setDropdownOpen(true); }}
                placeholder="Search by business name..."
                className={INPUT_CLS}
                autoComplete="off"
              />
              {searchLoading && (
                <div className="absolute right-3 top-9">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-tan border-t-transparent" />
                </div>
              )}
              {dropdownOpen && customerOptions.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full rounded-sm border border-brand-brown/10 bg-white shadow-2">
                  {customerOptions.map((c) => (
                    <li
                      key={c.id}
                      onClick={() => handleSelectCustomer(c)}
                      className="cursor-pointer px-4 py-2.5 hover:bg-brand-tan/8 border-b border-brand-brown/6 last:border-0"
                    >
                      <p className="text-sm font-medium text-brand-brown">{c.businessName}</p>
                      <p className="text-xs text-brand-olive/60">
                        {c.city ? `${c.city}, ` : ""}{c.district} · {c.regionCode}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              {dropdownOpen && !searchLoading && customerQuery.length >= 2 && customerOptions.length === 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-sm border border-brand-brown/10 bg-white px-4 py-3 text-sm text-brand-olive/50 shadow-2">
                  No customers found for &ldquo;{customerQuery}&rdquo;
                </div>
              )}
              {selectedCustomer && (
                <p className="mt-1.5 text-xs text-success">
                  ✓ Selected: {selectedCustomer.businessName} ({selectedCustomer.regionCode})
                </p>
              )}
            </div>

            {/* Visit date */}
            <div>
              <label className={LABEL_CLS}>
                Visit Date <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                value={visitDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setVisitDate(e.target.value)}
                required
                className={INPUT_CLS}
              />
            </div>

            {/* Purpose */}
            <div>
              <label className={LABEL_CLS}>
                Purpose <span className="text-danger">*</span>
              </label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                required
                className={INPUT_CLS}
              >
                {VISIT_PURPOSES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Region code */}
            <div>
              <label className={LABEL_CLS}>
                Region <span className="text-danger">*</span>
              </label>
              <select
                value={regionCode}
                onChange={(e) => setRegionCode(e.target.value)}
                required
                className={INPUT_CLS}
              >
                <option value="">Select region…</option>
                {REGION_CODES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              {selectedCustomer && (
                <p className="mt-1 text-xs text-brand-olive/50">
                  Pre-filled from customer region. Change only if different.
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className={LABEL_CLS}>Notes / Agenda</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="What do you plan to discuss or accomplish during this visit?"
                className={INPUT_CLS + " resize-none"}
              />
            </div>

            {/* Next steps */}
            <div>
              <label className={LABEL_CLS}>Next Steps (optional)</label>
              <textarea
                value={nextSteps}
                onChange={(e) => setNextSteps(e.target.value)}
                rows={2}
                placeholder="Pre-planned next steps after this visit…"
                className={INPUT_CLS + " resize-none"}
              />
            </div>

            {/* Follow-up date */}
            <div>
              <label className={LABEL_CLS}>Follow-up Date (optional)</label>
              <input
                type="date"
                value={followUpDate}
                min={visitDate || new Date().toISOString().slice(0, 10)}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className={INPUT_CLS}
              />
            </div>

            {submitError && (
              <div className="rounded-sm bg-danger/10 p-3 text-sm text-danger">
                {submitError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-sm bg-brand-brown px-4 py-2 font-display text-[13px] font-bold tracking-wide text-white transition-colors hover:bg-brand-brown/90 disabled:opacity-60"
              >
                {submitting ? "Scheduling…" : "Schedule Visit"}
              </button>
              <Link
                href="/visits"
                className="rounded-sm border border-brand-brown/20 px-4 py-2 text-sm font-medium text-brand-olive hover:bg-brand-brown/5"
              >
                Cancel
              </Link>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
