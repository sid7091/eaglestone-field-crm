"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";

interface CustomerOption {
  id: string;
  businessName: string;
  regionCode: string;
  city: string | null;
  district: string;
}

interface PlanVisitModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  preselectedCustomer?: CustomerOption | null;
  defaultPurpose?: string;
  newClientMode?: boolean;
}

const VISIT_PURPOSES = [
  { value: "SALES_PITCH", label: "Sales Pitch" },
  { value: "SAMPLE_DELIVERY", label: "Sample Delivery" },
  { value: "ORDER_FOLLOWUP", label: "Order Follow-up" },
  { value: "COMPLAINT_RESOLUTION", label: "Complaint Resolution" },
  { value: "PAYMENT_COLLECTION", label: "Payment Collection" },
  { value: "RELATIONSHIP_BUILDING", label: "Relationship Building" },
  { value: "SITE_SURVEY", label: "Site Survey" },
];

const REGION_CODES = [
  { value: "AP", label: "Andhra Pradesh" }, { value: "AR", label: "Arunachal Pradesh" },
  { value: "AS", label: "Assam" }, { value: "BR", label: "Bihar" },
  { value: "CG", label: "Chhattisgarh" }, { value: "GA", label: "Goa" },
  { value: "GJ", label: "Gujarat" }, { value: "HR", label: "Haryana" },
  { value: "HP", label: "Himachal Pradesh" }, { value: "JH", label: "Jharkhand" },
  { value: "KA", label: "Karnataka" }, { value: "KL", label: "Kerala" },
  { value: "MP", label: "Madhya Pradesh" }, { value: "MH", label: "Maharashtra" },
  { value: "MN", label: "Manipur" }, { value: "ML", label: "Meghalaya" },
  { value: "MZ", label: "Mizoram" }, { value: "NL", label: "Nagaland" },
  { value: "OD", label: "Odisha" }, { value: "PB", label: "Punjab" },
  { value: "RJ", label: "Rajasthan" }, { value: "SK", label: "Sikkim" },
  { value: "TN", label: "Tamil Nadu" }, { value: "TG", label: "Telangana" },
  { value: "TR", label: "Tripura" }, { value: "UP", label: "Uttar Pradesh" },
  { value: "UK", label: "Uttarakhand" }, { value: "WB", label: "West Bengal" },
  { value: "DL", label: "Delhi" }, { value: "JK", label: "Jammu & Kashmir" },
];

const INPUT_CLS = "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";

export default function PlanVisitModal({ open, onClose, onCreated, preselectedCustomer, defaultPurpose, newClientMode }: PlanVisitModalProps) {
  const router = useRouter();

  // Existing customer search
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // New client fields
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientRegion, setNewClientRegion] = useState("");
  const [newClientDistrict, setNewClientDistrict] = useState("");
  const [newClientAddress, setNewClientAddress] = useState("");

  // Visit fields
  const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 10));
  const [purpose, setPurpose] = useState(defaultPurpose || "SALES_PITCH");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setVisitDate(new Date().toISOString().slice(0, 10));
      setPurpose(defaultPurpose || "SALES_PITCH");
      setNotes("");
      setError("");
      setNewClientName("");
      setNewClientPhone("");
      setNewClientRegion("");
      setNewClientDistrict("");
      setNewClientAddress("");
      if (preselectedCustomer) {
        setSelectedCustomer(preselectedCustomer);
        setCustomerQuery(preselectedCustomer.businessName);
      } else {
        setSelectedCustomer(null);
        setCustomerQuery("");
      }
    }
  }, [open, preselectedCustomer, defaultPurpose]);

  const searchCustomers = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setCustomerOptions([]); return; }
    setSearchLoading(true);
    try {
      const res = await api.get<{ data: CustomerOption[] }>(`/customers?search=${encodeURIComponent(q)}&limit=5`);
      setCustomerOptions(res.data);
    } catch { setCustomerOptions([]); }
    finally { setSearchLoading(false); }
  }, []);

  useEffect(() => {
    if (!open || selectedCustomer || newClientMode) return;
    const timer = setTimeout(() => {
      searchCustomers(customerQuery);
      setDropdownOpen(customerQuery.length >= 2);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerQuery, selectedCustomer, searchCustomers, open, newClientMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newClientMode) {
      // Create customer first, then create visit
      if (!newClientName.trim()) { setError("Customer name is required."); return; }
      if (!newClientPhone.trim()) { setError("Phone is required."); return; }
      if (!newClientRegion) { setError("Region is required."); return; }
      if (!newClientDistrict.trim()) { setError("District is required."); return; }

      setSubmitting(true);
      try {
        // Create the customer
        const customer = await api.post<{ id: string }>("/customers", {
          businessName: newClientName.trim(),
          phone: newClientPhone.trim(),
          regionCode: newClientRegion,
          district: newClientDistrict.trim(),
          address: newClientAddress.trim() || newClientDistrict.trim(),
          customerType: "DIRECT_CLIENT",
          leadStatus: "NEW",
        });

        // Then create the visit
        await api.post("/visits", {
          customerId: customer.id,
          visitDate,
          purpose,
          regionCode: newClientRegion,
          notes: notes.trim() || undefined,
        });

        onCreated?.();
        onClose();
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to schedule visit");
      } finally {
        setSubmitting(false);
      }
    } else {
      // Existing customer mode
      if (!selectedCustomer) { setError("Please select a customer."); return; }

      setSubmitting(true);
      try {
        await api.post("/visits", {
          customerId: selectedCustomer.id,
          visitDate,
          purpose,
          regionCode: selectedCustomer.regionCode,
          notes: notes.trim() || undefined,
        });
        onCreated?.();
        onClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to schedule visit");
      } finally {
        setSubmitting(false);
      }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-100 bg-white px-5 py-4 rounded-t-2xl">
          <h2 className="text-lg font-bold text-stone-900">
            {newClientMode ? "Schedule New Client Visit" : "Plan a Visit"}
          </h2>
          <button onClick={onClose} className="rounded-full p-1 text-stone-400 hover:bg-stone-100">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {newClientMode ? (
            <>
              {/* New client details */}
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">Customer Name *</label>
                <input type="text" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} className={INPUT_CLS} placeholder="e.g. Sharma Marble Works" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">Phone *</label>
                <input type="tel" value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} className={INPUT_CLS} placeholder="+91 98765 43210" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">Region *</label>
                  <select value={newClientRegion} onChange={(e) => setNewClientRegion(e.target.value)} className={INPUT_CLS}>
                    <option value="">Select region</option>
                    {REGION_CODES.map((r) => (
                      <option key={r.value} value={r.value}>{r.value} — {r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">District *</label>
                  <input type="text" value={newClientDistrict} onChange={(e) => setNewClientDistrict(e.target.value)} className={INPUT_CLS} placeholder="e.g. Jaipur" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">Address</label>
                <input type="text" value={newClientAddress} onChange={(e) => setNewClientAddress(e.target.value)} className={INPUT_CLS} placeholder="Street address (optional)" />
              </div>
            </>
          ) : (
            <>
              {/* Existing customer search */}
              <div ref={dropdownRef} className="relative">
                <label className="mb-1 block text-sm font-medium text-stone-700">Customer *</label>
                <input
                  type="text"
                  value={customerQuery}
                  onChange={(e) => { setCustomerQuery(e.target.value); if (selectedCustomer) setSelectedCustomer(null); }}
                  onFocus={() => { if (customerOptions.length > 0 && !selectedCustomer) setDropdownOpen(true); }}
                  className={INPUT_CLS}
                  placeholder="Search by name..."
                  autoComplete="off"
                />
                {searchLoading && (
                  <div className="absolute right-3 top-9">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                  </div>
                )}
                {dropdownOpen && customerOptions.length > 0 && (
                  <ul className="absolute z-50 mt-1 w-full rounded-lg border border-stone-200 bg-white shadow-lg max-h-40 overflow-y-auto">
                    {customerOptions.map((c) => (
                      <li
                        key={c.id}
                        onClick={() => { setSelectedCustomer(c); setCustomerQuery(c.businessName); setDropdownOpen(false); }}
                        className="cursor-pointer px-3 py-2.5 active:bg-amber-50"
                      >
                        <p className="text-sm font-medium text-stone-900">{c.businessName}</p>
                        <p className="text-xs text-stone-500">{c.district}, {c.regionCode}</p>
                      </li>
                    ))}
                  </ul>
                )}
                {selectedCustomer && (
                  <p className="mt-1 text-xs text-green-700">Selected: {selectedCustomer.businessName}</p>
                )}
              </div>
            </>
          )}

          {/* Date + Purpose row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Date *</label>
              <input type="date" value={visitDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setVisitDate(e.target.value)} className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Purpose *</label>
              <select value={purpose} onChange={(e) => setPurpose(e.target.value)} className={INPUT_CLS}>
                {VISIT_PURPOSES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={INPUT_CLS} placeholder="What to discuss..." />
          </div>

          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Scheduling..." : newClientMode ? "Create Client & Schedule" : "Schedule Visit"}
          </button>
        </form>
      </div>
    </div>
  );
}
