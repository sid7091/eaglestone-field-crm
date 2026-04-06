"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import SitePhotos from "@/components/ui/SitePhotos";
import { api } from "@/lib/api-client";

// ─── Enum options ─────────────────────────────────────────────────────────────

const CUSTOMER_TYPES = [
  { value: "DEALER", label: "Dealer" },
  { value: "ARCHITECT", label: "Architect" },
  { value: "BUILDER", label: "Builder" },
  { value: "CONTRACTOR", label: "Contractor" },
  { value: "DIRECT_CLIENT", label: "Direct Client" },
  { value: "QUARRY_OWNER", label: "Quarry Owner" },
];

const CUSTOMER_TIERS = [
  { value: "PLATINUM", label: "Platinum" },
  { value: "GOLD", label: "Gold" },
  { value: "SILVER", label: "Silver" },
  { value: "BRONZE", label: "Bronze" },
];

const LEAD_STATUSES = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "PROPOSAL_SENT", label: "Proposal Sent" },
  { value: "NEGOTIATION", label: "Negotiation" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
  { value: "DORMANT", label: "Dormant" },
];

const REGION_CODES = [
  { value: "AP", label: "Andhra Pradesh" },
  { value: "AR", label: "Arunachal Pradesh" },
  { value: "AS", label: "Assam" },
  { value: "BR", label: "Bihar" },
  { value: "CG", label: "Chhattisgarh" },
  { value: "GA", label: "Goa" },
  { value: "GJ", label: "Gujarat" },
  { value: "HR", label: "Haryana" },
  { value: "HP", label: "Himachal Pradesh" },
  { value: "JH", label: "Jharkhand" },
  { value: "KA", label: "Karnataka" },
  { value: "KL", label: "Kerala" },
  { value: "MP", label: "Madhya Pradesh" },
  { value: "MH", label: "Maharashtra" },
  { value: "MN", label: "Manipur" },
  { value: "ML", label: "Meghalaya" },
  { value: "MZ", label: "Mizoram" },
  { value: "NL", label: "Nagaland" },
  { value: "OD", label: "Odisha" },
  { value: "PB", label: "Punjab" },
  { value: "RJ", label: "Rajasthan" },
  { value: "SK", label: "Sikkim" },
  { value: "TN", label: "Tamil Nadu" },
  { value: "TG", label: "Telangana" },
  { value: "TR", label: "Tripura" },
  { value: "UP", label: "Uttar Pradesh" },
  { value: "UK", label: "Uttarakhand" },
  { value: "WB", label: "West Bengal" },
  { value: "DL", label: "Delhi" },
  { value: "JK", label: "Jammu & Kashmir" },
];

const MATERIAL_TYPES = [
  "Granite",
  "Marble",
  "Quartz",
  "Tile",
  "Quartzite",
  "Nano White",
  "Nano Statuario",
];

// ─── Form state type ──────────────────────────────────────────────────────────

interface Requirement {
  colorName: string;
  materialType: string;
  quantitySqft: number;
}

interface FormState {
  businessName: string;
  contactPerson: string;
  phone: string;
  altPhone: string;
  email: string;
  gstin: string;
  pan: string;
  customerType: string;
  tier: string;
  leadStatus: string;
  regionCode: string;
  district: string;
  city: string;
  address: string;
  pincode: string;
  currentRequirements: Requirement[];
  notes: string;
  locationLatitude: string;
  locationLongitude: string;
  locationAccuracy: string;
}

const INITIAL_STATE: FormState = {
  businessName: "",
  contactPerson: "",
  phone: "",
  altPhone: "",
  email: "",
  gstin: "",
  pan: "",
  customerType: "",
  tier: "BRONZE",
  leadStatus: "NEW",
  regionCode: "",
  district: "",
  city: "",
  address: "",
  pincode: "",
  currentRequirements: [],
  notes: "",
  locationLatitude: "",
  locationLongitude: "",
  locationAccuracy: "",
};

// ─── Shared input class ───────────────────────────────────────────────────────

const INPUT_CLS =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";
const LABEL_CLS = "mb-1 block text-sm font-medium text-stone-700";

// ─── Address suggestion type ──────────────────────────────────────────────────

interface AddressSuggestion {
  place_id: string;
  description: string;
  lat: string;
  lng: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewCustomerPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [sitePhotos, setSitePhotos] = useState<string[]>([]);

  // Address autocomplete
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Current requirements state
  const [newReqColor, setNewReqColor] = useState("");
  const [newReqMaterial, setNewReqMaterial] = useState("");
  const [newReqQty, setNewReqQty] = useState("");

  // ── Field helpers ──────────────────────────────────────────────────────────

  const setField = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  // ── Requirements helpers ───────────────────────────────────────────────────

  const addRequirement = () => {
    if (!newReqColor.trim() || !newReqMaterial) return;
    const qty = parseFloat(newReqQty) || 0;
    setForm((prev) => ({
      ...prev,
      currentRequirements: [
        ...prev.currentRequirements,
        { colorName: newReqColor.trim(), materialType: newReqMaterial, quantitySqft: qty },
      ],
    }));
    setNewReqColor("");
    setNewReqMaterial("");
    setNewReqQty("");
  };

  const removeRequirement = (index: number) => {
    setForm((prev) => ({
      ...prev,
      currentRequirements: prev.currentRequirements.filter((_, i) => i !== index),
    }));
  };



  // ── GPS capture ────────────────────────────────────────────────────────────

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by this browser.");
      return;
    }
    setGpsLoading(true);
    setGpsError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          locationLatitude: String(pos.coords.latitude),
          locationLongitude: String(pos.coords.longitude),
          locationAccuracy: String(Math.round(pos.coords.accuracy)),
        }));
        setGpsLoading(false);
      },
      (err) => {
        setGpsError(`Location error: ${err.message}`);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ── Address autocomplete (server-side, no SDK) ──────────────────────────────

  // Close dropdown only when tapping outside both the wrapper and the dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const [addressSearching, setAddressSearching] = useState(false);

  const fetchSuggestions = useCallback(async (input: string) => {
    if (input.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setAddressSearching(true);
    try {
      const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(input)}`);
      const data = await res.json();
      const preds: AddressSuggestion[] = data.predictions || [];
      setSuggestions(preds);
      if (preds.length > 0) setShowSuggestions(true);
    } catch {
      setSuggestions([]);
    } finally {
      setAddressSearching(false);
    }
  }, []);

  const handleAddressInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, address: value }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 400);
  };

  const selectSuggestion = (s: AddressSuggestion) => {
    setShowSuggestions(false);
    setSuggestions([]);

    // Match state name to region code
    let regionCode = "";
    if (s.state) {
      const match = REGION_CODES.find(
        (r) => r.label.toLowerCase() === s.state.toLowerCase()
      );
      if (match) regionCode = match.value;
    }

    setForm((prev) => ({
      ...prev,
      address: s.description,
      city: s.city || prev.city,
      district: s.district || prev.district,
      regionCode: regionCode || prev.regionCode,
      pincode: s.pincode || prev.pincode,
      locationLatitude: s.lat || prev.locationLatitude,
      locationLongitude: s.lng || prev.locationLongitude,
    }));
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation — businessName is now "Customer Name" and is mandatory
    if (!form.businessName.trim()) { setError("Customer name is required."); return; }
    if (!form.phone.trim()) { setError("Phone is required."); return; }
    if (!form.customerType) { setError("Customer type is required."); return; }
    if (!form.regionCode) { setError("Region is required."); return; }
    if (!form.district.trim()) { setError("District is required."); return; }
    if (!form.address.trim()) { setError("Address is required."); return; }

    setLoading(true);

    const location =
      form.locationLatitude && form.locationLongitude
        ? {
            latitude: parseFloat(form.locationLatitude),
            longitude: parseFloat(form.locationLongitude),
            accuracy: form.locationAccuracy ? parseFloat(form.locationAccuracy) : undefined,
            timestamp: new Date().toISOString(),
          }
        : null;

    const body: Record<string, unknown> = {
      businessName: form.businessName.trim(),
      contactPerson: form.contactPerson.trim() || null,
      phone: form.phone.trim(),
      altPhone: form.altPhone.trim() || null,
      email: form.email.trim() || null,
      gstin: form.gstin.trim() || null,
      pan: form.pan.trim() || null,
      customerType: form.customerType,
      tier: form.tier,
      leadStatus: form.leadStatus,
      regionCode: form.regionCode,
      district: form.district.trim(),
      city: form.city.trim() || null,
      address: form.address.trim(),
      pincode: form.pincode.trim() || null,
      currentRequirements: form.currentRequirements,
      notes: form.notes.trim() || null,
      location,
    };

    try {
      await api.post("/customers", body);
      router.push("/customers");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create customer");
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Add Customer</h1>
          <p className="text-sm text-stone-500">Register a new customer account</p>
        </div>
        <Link
          href="/customers"
          className="w-fit rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Cancel
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* ── Business Identity ──────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-stone-900">Customer Information</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className={LABEL_CLS}>Customer Name *</label>
                  <input
                    type="text"
                    value={form.businessName}
                    onChange={setField("businessName")}
                    className={INPUT_CLS}
                    placeholder="e.g. Sharma Marble Works"
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Contact Person</label>
                  <input
                    type="text"
                    value={form.contactPerson}
                    onChange={setField("contactPerson")}
                    className={INPUT_CLS}
                    placeholder="Primary contact name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL_CLS}>Phone *</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={setField("phone")}
                      className={INPUT_CLS}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Alt. Phone</label>
                    <input
                      type="tel"
                      value={form.altPhone}
                      onChange={setField("altPhone")}
                      className={INPUT_CLS}
                    />
                  </div>
                </div>
                <div>
                  <label className={LABEL_CLS}>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={setField("email")}
                    className={INPUT_CLS}
                    placeholder="contact@example.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL_CLS}>GSTIN</label>
                    <input
                      type="text"
                      value={form.gstin}
                      onChange={setField("gstin")}
                      className={INPUT_CLS}
                      placeholder="22AAAAA0000A1Z5"
                      maxLength={15}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>PAN</label>
                    <input
                      type="text"
                      value={form.pan}
                      onChange={setField("pan")}
                      className={INPUT_CLS}
                      placeholder="AAAAA0000A"
                      maxLength={10}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Classification ─────────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-stone-900">Classification</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className={LABEL_CLS}>Customer Type *</label>
                  <select
                    value={form.customerType}
                    onChange={setField("customerType")}
                    className={INPUT_CLS}
                  >
                    <option value="">Select type</option>
                    {CUSTOMER_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS}>Tier</label>
                  <select
                    value={form.tier}
                    onChange={setField("tier")}
                    className={INPUT_CLS}
                  >
                    {CUSTOMER_TIERS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS}>Lead Status</label>
                  <select
                    value={form.leadStatus}
                    onChange={setField("leadStatus")}
                    className={INPUT_CLS}
                  >
                    {LEAD_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS}>Notes</label>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={setField("notes")}
                    className={INPUT_CLS}
                    placeholder="Any additional context..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Location & Region ──────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-stone-900">Location & Region</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div ref={wrapperRef}>
                  <label className={LABEL_CLS}>Address *</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.address}
                      onChange={handleAddressInput}
                      onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                      className={INPUT_CLS}
                      placeholder="Type 3+ characters to search..."
                      autoComplete="off"
                    />
                    {addressSearching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                      </div>
                    )}
                  </div>

                  {/* Floating suggestions menu */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div
                      className="fixed inset-x-0 bottom-0 z-[9999] max-h-[50vh] overflow-y-auto rounded-t-2xl border-t border-stone-200 bg-white shadow-2xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:right-0 sm:top-full sm:mt-1 sm:rounded-lg sm:rounded-t-lg sm:border sm:shadow-xl"
                    >
                      <div className="sticky top-0 flex items-center justify-between border-b border-stone-100 bg-stone-50 px-4 py-2 sm:hidden">
                        <span className="text-xs font-medium text-stone-500">Select an address</span>
                        <button
                          type="button"
                          onClick={() => setShowSuggestions(false)}
                          className="text-stone-400"
                        >
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                          </svg>
                        </button>
                      </div>
                      {suggestions.map((s) => (
                        <button
                          key={s.place_id}
                          type="button"
                          onClick={() => selectSuggestion(s)}
                          className="flex w-full items-start gap-3 border-b border-stone-50 px-4 py-3.5 text-left active:bg-amber-50 last:border-b-0"
                        >
                          <svg className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                          </svg>
                          <span className="text-sm leading-snug text-stone-800">{s.description}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className={LABEL_CLS}>Region *</label>
                  <select
                    value={form.regionCode}
                    onChange={setField("regionCode")}
                    className={INPUT_CLS}
                  >
                    <option value="">Select state / region</option>
                    {REGION_CODES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.value} — {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL_CLS}>District *</label>
                    <input
                      type="text"
                      value={form.district}
                      onChange={setField("district")}
                      className={INPUT_CLS}
                      placeholder="e.g. Jaipur"
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>City</label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={setField("city")}
                      className={INPUT_CLS}
                      placeholder="e.g. Jaipur"
                    />
                  </div>
                </div>
                <div>
                  <label className={LABEL_CLS}>Pincode</label>
                  <input
                    type="text"
                    value={form.pincode}
                    onChange={setField("pincode")}
                    className={INPUT_CLS}
                    placeholder="302001"
                    maxLength={6}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── GPS Location ───────────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-stone-900">GPS Location</h2>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-stone-500">
                Capture the customer&apos;s GPS coordinates for geofence-based visit validation.
              </p>
              <button
                type="button"
                onClick={captureLocation}
                disabled={gpsLoading}
                className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                {gpsLoading ? "Getting location..." : "Capture Current Location"}
              </button>

              {gpsError && (
                <p className="mt-2 text-xs text-red-600">{gpsError}</p>
              )}

              {form.locationLatitude && form.locationLongitude && (
                <div className="mt-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                  <p className="text-xs font-medium text-green-700">Location captured</p>
                  <p className="mt-1 font-mono text-sm text-green-900">
                    {parseFloat(form.locationLatitude).toFixed(6)}, {parseFloat(form.locationLongitude).toFixed(6)}
                  </p>
                  {form.locationAccuracy && (
                    <p className="text-xs text-green-600">Accuracy: +/-{form.locationAccuracy}m</p>
                  )}
                </div>
              )}

              <div className="mt-4 space-y-3">
                <p className="text-xs font-medium text-stone-500">Or enter manually:</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL_CLS}>Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={form.locationLatitude}
                      onChange={setField("locationLatitude")}
                      className={INPUT_CLS}
                      placeholder="26.9124"
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={form.locationLongitude}
                      onChange={setField("locationLongitude")}
                      className={INPUT_CLS}
                      placeholder="75.7873"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* ── Current Requirements ────────────────────────────────────────── */}
        <Card className="mt-6">
          <CardHeader>
            <h2 className="font-semibold text-stone-900">Current Requirements</h2>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-stone-500">
              Add the materials this customer currently needs.
            </p>

            {/* Add new requirement inputs */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className={LABEL_CLS}>Color Name</label>
                  <input
                    type="text"
                    value={newReqColor}
                    onChange={(e) => setNewReqColor(e.target.value)}
                    className={INPUT_CLS}
                    placeholder="e.g. Statuario White"
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Material Type</label>
                  <select
                    value={newReqMaterial}
                    onChange={(e) => setNewReqMaterial(e.target.value)}
                    className={INPUT_CLS}
                  >
                    <option value="">Select material</option>
                    {MATERIAL_TYPES.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS}>Qty (sqft)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={newReqQty}
                    onChange={(e) => setNewReqQty(e.target.value)}
                    className={INPUT_CLS}
                    placeholder="0"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={addRequirement}
                disabled={!newReqColor.trim() || !newReqMaterial}
                className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-40 transition-colors sm:w-auto"
              >
                + Add Requirement
              </button>
            </div>

            {/* Requirements table — read-only display */}
            {form.currentRequirements.length > 0 && (
              <div className="mt-4 overflow-x-auto rounded-lg border border-stone-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 text-left">
                      <th className="px-4 py-2.5 font-semibold text-stone-600">#</th>
                      <th className="px-4 py-2.5 font-semibold text-stone-600">Color Name</th>
                      <th className="px-4 py-2.5 font-semibold text-stone-600">Material Type</th>
                      <th className="px-4 py-2.5 font-semibold text-stone-600 text-right">Qty (sqft)</th>
                      <th className="px-4 py-2.5 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {form.currentRequirements.map((req, i) => (
                      <tr key={i} className="hover:bg-stone-50">
                        <td className="px-4 py-2.5 text-stone-400">{i + 1}</td>
                        <td className="px-4 py-2.5 text-stone-900">{req.colorName}</td>
                        <td className="px-4 py-2.5 text-stone-700">{req.materialType}</td>
                        <td className="px-4 py-2.5 text-stone-900 text-right font-medium">
                          {req.quantitySqft ? req.quantitySqft.toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeRequirement(i)}
                            className="text-stone-400 hover:text-red-500 transition-colors"
                            title="Remove"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Site Photos ──────────────────────────────────────────────────── */}
        <Card className="mt-6">
          <CardHeader>
            <h2 className="font-semibold text-stone-900">Site Photos</h2>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-stone-500">Capture photos of the client site.</p>
            <SitePhotos photos={sitePhotos} onPhotosChange={setSitePhotos} />
          </CardContent>
        </Card>

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        <div className="mt-6 flex justify-end gap-3 pb-24">
          <button
            type="button"
            onClick={() => router.push("/customers")}
            className="rounded-lg border border-stone-300 px-6 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-amber-500 px-6 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
          >
            {loading ? "Saving..." : "Create Customer"}
          </button>
        </div>
      </form>
    </div>
  );
}
