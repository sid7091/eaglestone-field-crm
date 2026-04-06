"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import PlanVisitModal from "@/components/ui/PlanVisitModal";
import SitePhotos from "@/components/ui/SitePhotos";
import { api } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Customer {
  id: string;
  businessName: string;
  contactPerson: string | null;
  phone: string;
  altPhone: string | null;
  email: string | null;
  gstin: string | null;
  pan: string | null;
  customerType: string;
  tier: string;
  leadStatus: string;
  regionCode: string;
  district: string;
  city: string | null;
  address: string;
  pincode: string | null;
  location: { latitude: number; longitude: number } | null;
  preferredMaterials: string[];
  annualPotentialINR: number;
  lifetimeValueINR: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Visit {
  id: string;
  visitDate: string;
  purpose: string;
  status: string;
  durationMinutes: number | null;
  geofenceValidation: { isWithinGeofence: boolean } | null;
}

const TIER_COLORS: Record<string, string> = {
  PLATINUM: "bg-violet-100 text-violet-800",
  GOLD: "bg-amber-100 text-amber-800",
  SILVER: "bg-stone-100 text-stone-700",
  BRONZE: "bg-orange-100 text-orange-800",
};

const CUSTOMER_TYPES = [
  "DEALER", "ARCHITECT", "BUILDER", "CONTRACTOR", "DIRECT_CLIENT", "QUARRY_OWNER",
];
const TIERS = ["PLATINUM", "GOLD", "SILVER", "BRONZE"];
const LEAD_STATUSES = [
  "NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST", "DORMANT",
];

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Customer>>({});
  const [planVisitOpen, setPlanVisitOpen] = useState(false);
  const [sitePhotos, setSitePhotos] = useState<string[]>([]);

  const fetchCustomer = useCallback(async () => {
    try {
      const data = await api.get<Customer>(`/customers/${id}`);
      setCustomer(data);
      setForm(data);
    } catch {
      /* handled below */
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchVisits = useCallback(async () => {
    try {
      const res = await api.get<{ data: Visit[] }>(`/visits?customerId=${id}&limit=10`);
      setVisits(res.data);
    } catch {
      /* non-critical */
    }
  }, [id]);

  useEffect(() => {
    fetchCustomer();
    fetchVisits();
  }, [fetchCustomer, fetchVisits]);

  async function handleSave() {
    if (!customer) return;
    setSaving(true);
    try {
      const updated = await api.put<Customer>(`/customers/${id}`, {
        businessName: form.businessName,
        contactPerson: form.contactPerson,
        phone: form.phone,
        altPhone: form.altPhone,
        email: form.email,
        gstin: form.gstin,
        customerType: form.customerType,
        tier: form.tier,
        leadStatus: form.leadStatus,
        district: form.district,
        city: form.city,
        address: form.address,
        pincode: form.pincode,
        annualPotentialINR: form.annualPotentialINR,
        notes: form.notes,
      });
      setCustomer(updated);
      setEditing(false);
    } catch {
      alert("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-accent border-t-transparent" />
      </div>
    );
  }

  if (!customer) {
    return (
      <Card>
        <div className="p-8 text-center text-stone-500">Customer not found</div>
      </Card>
    );
  }

  const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-stone-500">{label}</dt>
      <dd className="mt-1 text-sm text-stone-900">{value || "—"}</dd>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <button
            onClick={() => router.push("/customers")}
            className="mb-2 text-sm text-stone-500 hover:text-stone-700"
          >
            &larr; Back to Customers
          </button>
          <h1 className="text-2xl font-bold text-stone-900">{customer.businessName}</h1>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge status={customer.leadStatus} />
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TIER_COLORS[customer.tier] || ""}`}>
              {customer.tier}
            </span>
            <span className="text-sm text-stone-500">{customer.customerType.replace(/_/g, " ")}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button
                onClick={() => { setEditing(false); setForm(customer); }}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:bg-brand-accent/90 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:bg-brand-accent/90"
            >
              Edit Customer
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <Card className="lg:col-span-2">
          <div className="border-b border-stone-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-stone-900">Business Details</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2">
            {editing ? (
              <>
                <div>
                  <label className="text-xs font-medium uppercase text-stone-500">Business Name</label>
                  <input value={form.businessName || ""} onChange={(e) => setForm({ ...form, businessName: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase text-stone-500">Contact Person</label>
                  <input value={form.contactPerson || ""} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase text-stone-500">Phone</label>
                  <input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase text-stone-500">Email</label>
                  <input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase text-stone-500">Type</label>
                  <select value={form.customerType || ""} onChange={(e) => setForm({ ...form, customerType: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm">
                    {CUSTOMER_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium uppercase text-stone-500">Tier</label>
                  <select value={form.tier || ""} onChange={(e) => setForm({ ...form, tier: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm">
                    {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium uppercase text-stone-500">Lead Status</label>
                  <select value={form.leadStatus || ""} onChange={(e) => setForm({ ...form, leadStatus: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm">
                    {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium uppercase text-stone-500">GSTIN</label>
                  <input value={form.gstin || ""} onChange={(e) => setForm({ ...form, gstin: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium uppercase text-stone-500">Address</label>
                  <textarea value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase text-stone-500">Annual Potential (INR)</label>
                  <input type="number" value={form.annualPotentialINR || 0} onChange={(e) => setForm({ ...form, annualPotentialINR: parseFloat(e.target.value) })} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase text-stone-500">Notes</label>
                  <textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
                </div>
              </>
            ) : (
              <>
                <Field label="Contact Person" value={customer.contactPerson} />
                <Field label="Phone" value={customer.phone} />
                <Field label="Alt Phone" value={customer.altPhone} />
                <Field label="Email" value={customer.email} />
                <Field label="GSTIN" value={customer.gstin} />
                <Field label="PAN" value={customer.pan} />
                <Field label="Address" value={`${customer.address}, ${customer.city || customer.district}, ${customer.regionCode} ${customer.pincode || ""}`} />
                <Field label="Preferred Materials" value={customer.preferredMaterials?.join(", ")} />
                <Field label="Annual Potential" value={formatCurrency(customer.annualPotentialINR)} />
                <Field label="Lifetime Value" value={formatCurrency(customer.lifetimeValueINR)} />
                <Field label="Notes" value={customer.notes} />
                <Field label="Created" value={formatDate(customer.createdAt)} />
              </>
            )}
          </div>
        </Card>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Location */}
          <Card>
            <div className="border-b border-stone-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-stone-900">Location</h2>
            </div>
            <div className="p-6">
              <div className="text-sm text-stone-600">
                <p>{customer.district}, {customer.regionCode}</p>
                {customer.location ? (
                  <p className="mt-2 text-xs text-stone-500">
                    GPS: {customer.location.latitude.toFixed(6)}, {customer.location.longitude.toFixed(6)}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-stone-400">No GPS location set</p>
                )}
              </div>
              {customer.location && (
                <div className="mt-4 flex h-32 items-center justify-center rounded-lg bg-stone-100 text-xs text-stone-400">
                  Map view (Phase 3.3)
                </div>
              )}
            </div>
          </Card>

          {/* Quick Stats */}
          <Card>
            <div className="border-b border-stone-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-stone-900">Visit Summary</h2>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-500">Total Visits</span>
                <span className="font-medium text-stone-900">{visits.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-500">Completed</span>
                <span className="font-medium text-green-600">{visits.filter((v) => v.status === "COMPLETED").length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-500">Flagged</span>
                <span className="font-medium text-red-600">{visits.filter((v) => v.status === "FLAGGED_FAKE").length}</span>
              </div>
            </div>
          </Card>

          {/* Site Photos */}
          <Card>
            <div className="border-b border-stone-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-stone-900">Site Photos</h2>
            </div>
            <div className="p-6">
              <SitePhotos photos={sitePhotos} onPhotosChange={setSitePhotos} />
            </div>
          </Card>
        </div>
      </div>

      {/* Recent Visits Table */}
      <Card>
        <div className="border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900">Recent Visits</h2>
          <button
            onClick={() => setPlanVisitOpen(true)}
            className="rounded-lg bg-brand-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-accent/90"
          >
            Plan Visit
          </button>
          <PlanVisitModal
            open={planVisitOpen}
            onClose={() => setPlanVisitOpen(false)}
            onCreated={() => fetchVisits()}
            preselectedCustomer={customer ? { id: customer.id, businessName: customer.businessName, regionCode: customer.regionCode, city: customer.city, district: customer.district } : null}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Purpose</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Geofence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {visits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-stone-500">
                    No visits recorded yet
                  </td>
                </tr>
              ) : (
                visits.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => router.push(`/visits/${v.id}`)}
                    className="cursor-pointer hover:bg-stone-50"
                  >
                    <td className="px-4 py-3 text-sm text-stone-900">{formatDate(v.visitDate)}</td>
                    <td className="px-4 py-3 text-sm text-stone-600">{v.purpose.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                    <td className="px-4 py-3 text-sm text-stone-600">{v.durationMinutes ? `${v.durationMinutes}m` : "—"}</td>
                    <td className="px-4 py-3 text-sm">
                      {v.geofenceValidation ? (
                        v.geofenceValidation.isWithinGeofence
                          ? <span className="text-green-600 font-medium">Valid</span>
                          : <span className="text-red-600 font-medium">Invalid</span>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
