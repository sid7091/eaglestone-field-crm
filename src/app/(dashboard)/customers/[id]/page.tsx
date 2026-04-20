"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import Button from "@/components/ui/Button";
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

const CUSTOMER_TYPES = ["DEALER", "ARCHITECT", "BUILDER", "CONTRACTOR", "DIRECT_CLIENT", "QUARRY_OWNER"];
const TIERS = ["PLATINUM", "GOLD", "SILVER", "BRONZE"];
const LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST", "DORMANT"];

const INPUT_CLS =
  "w-full rounded-sm border border-brand-brown/20 bg-surface px-3 py-2 text-[13px] text-brand-brown placeholder:text-brand-olive/35 focus:border-brand-tan focus:outline-none focus:ring-2 focus:ring-brand-tan/20 transition-colors";
const LABEL_CLS =
  "mb-1 block font-display text-[11px] font-semibold tracking-[.12em] text-brand-olive/80 uppercase";

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
    } catch { /* handled below */ } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchVisits = useCallback(async () => {
    try {
      const res = await api.get<{ data: Visit[] }>(`/visits?customerId=${id}&limit=10`);
      setVisits(res.data);
    } catch { /* non-critical */ }
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-tan/30 border-t-brand-tan" />
      </div>
    );
  }

  if (!customer) {
    return (
      <Card>
        <div className="p-8 text-center text-[13px] text-brand-olive/50">Customer not found</div>
      </Card>
    );
  }

  const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
      <dt className="font-display text-[10px] font-semibold tracking-[.12em] text-brand-olive/60 uppercase">{label}</dt>
      <dd className="mt-1 text-[13px] text-brand-brown">{value || "—"}</dd>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <button
            onClick={() => router.push("/customers")}
            className="mb-2 font-display text-[11px] font-semibold tracking-wide text-brand-olive/50 transition-colors hover:text-brand-olive"
          >
            ← BACK TO CUSTOMERS
          </button>
          <h1 className="font-display text-[28px] font-bold leading-tight text-brand-brown">{customer.businessName}</h1>
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge status={customer.leadStatus} />
            <StatusBadge status={customer.tier} variant="tier" />
            <span className="text-[12px] text-brand-olive/60">{customer.customerType.replace(/_/g, " ")}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setForm(customer); }}>
                CANCEL
              </Button>
              <Button variant="accent" size="sm" onClick={handleSave} loading={saving}>
                {saving ? "SAVING…" : "SAVE CHANGES"}
              </Button>
            </>
          ) : (
            <Button variant="accent" size="sm" onClick={() => setEditing(true)}>
              EDIT CUSTOMER
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="font-display text-[15px] font-bold text-brand-brown">Business Details</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {editing ? (
                <>
                  <div>
                    <label className={LABEL_CLS}>Business Name</label>
                    <input value={form.businessName || ""} onChange={(e) => setForm({ ...form, businessName: e.target.value })} className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Contact Person</label>
                    <input value={form.contactPerson || ""} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Phone</label>
                    <input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Email</label>
                    <input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Type</label>
                    <select value={form.customerType || ""} onChange={(e) => setForm({ ...form, customerType: e.target.value })} className={INPUT_CLS}>
                      {CUSTOMER_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Tier</label>
                    <select value={form.tier || ""} onChange={(e) => setForm({ ...form, tier: e.target.value })} className={INPUT_CLS}>
                      {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Lead Status</label>
                    <select value={form.leadStatus || ""} onChange={(e) => setForm({ ...form, leadStatus: e.target.value })} className={INPUT_CLS}>
                      {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLS}>GSTIN</label>
                    <input value={form.gstin || ""} onChange={(e) => setForm({ ...form, gstin: e.target.value })} className={INPUT_CLS} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={LABEL_CLS}>Address</label>
                    <textarea value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Annual Potential (INR)</label>
                    <input type="number" value={form.annualPotentialINR || 0} onChange={(e) => setForm({ ...form, annualPotentialINR: parseFloat(e.target.value) })} className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Notes</label>
                    <textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={INPUT_CLS} />
                  </div>
                </>
              ) : (
                <>
                  <Field label="Contact Person" value={customer.contactPerson} />
                  <Field label="Phone" value={<span className="font-mono">{customer.phone}</span>} />
                  <Field label="Alt Phone" value={customer.altPhone && <span className="font-mono">{customer.altPhone}</span>} />
                  <Field label="Email" value={customer.email} />
                  <Field label="GSTIN" value={customer.gstin && <span className="font-mono">{customer.gstin}</span>} />
                  <Field label="PAN" value={customer.pan && <span className="font-mono">{customer.pan}</span>} />
                  <Field label="Address" value={`${customer.address}, ${customer.city || customer.district}, ${customer.regionCode} ${customer.pincode || ""}`} />
                  <Field label="Preferred Materials" value={customer.preferredMaterials?.join(", ")} />
                  <Field label="Annual Potential" value={<span className="font-mono">{formatCurrency(customer.annualPotentialINR)}</span>} />
                  <Field label="Lifetime Value" value={<span className="font-mono">{formatCurrency(customer.lifetimeValueINR)}</span>} />
                  <Field label="Notes" value={customer.notes} />
                  <Field label="Created" value={formatDate(customer.createdAt)} />
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Side Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="font-display text-[15px] font-bold text-brand-brown">Location</h2>
            </CardHeader>
            <CardContent>
              <div className="text-[13px] text-brand-olive">
                <p>{customer.district}, {customer.regionCode}</p>
                {customer.location ? (
                  <p className="mt-2 font-mono text-[11px] text-brand-olive/50">
                    {customer.location.latitude.toFixed(6)}, {customer.location.longitude.toFixed(6)}
                  </p>
                ) : (
                  <p className="mt-2 text-[11px] text-brand-olive/40">No GPS location set</p>
                )}
              </div>
              {customer.location && (
                <div className="mt-4 flex h-32 items-center justify-center rounded-sm bg-surface-2 font-display text-[10px] tracking-wide text-brand-olive/30">
                  MAP VIEW
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-display text-[15px] font-bold text-brand-brown">Visit Summary</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-brand-olive/60">Total Visits</span>
                  <span className="font-display font-bold text-brand-brown">{visits.length}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-brand-olive/60">Completed</span>
                  <span className="font-display font-bold text-success">{visits.filter((v) => v.status === "COMPLETED").length}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-brand-olive/60">Flagged</span>
                  <span className="font-display font-bold text-danger">{visits.filter((v) => v.status === "FLAGGED_FAKE").length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-display text-[15px] font-bold text-brand-brown">Site Photos</h2>
            </CardHeader>
            <CardContent>
              <SitePhotos photos={sitePhotos} onPhotosChange={setSitePhotos} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Visits */}
      <Card>
        <CardHeader>
          <h2 className="font-display text-[15px] font-bold text-brand-brown">Recent Visits</h2>
          <Button variant="accent" size="sm" onClick={() => setPlanVisitOpen(true)}>
            PLAN VISIT
          </Button>
        </CardHeader>
        <PlanVisitModal
          open={planVisitOpen}
          onClose={() => setPlanVisitOpen(false)}
          onCreated={() => fetchVisits()}
          preselectedCustomer={customer ? { id: customer.id, businessName: customer.businessName, regionCode: customer.regionCode, city: customer.city, district: customer.district } : null}
        />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-brown/10">
                <th className="px-4 py-3 text-left font-display text-[10px] font-semibold tracking-[.12em] text-brand-olive/60 uppercase">Date</th>
                <th className="px-4 py-3 text-left font-display text-[10px] font-semibold tracking-[.12em] text-brand-olive/60 uppercase">Purpose</th>
                <th className="px-4 py-3 text-left font-display text-[10px] font-semibold tracking-[.12em] text-brand-olive/60 uppercase">Status</th>
                <th className="px-4 py-3 text-left font-display text-[10px] font-semibold tracking-[.12em] text-brand-olive/60 uppercase">Duration</th>
                <th className="px-4 py-3 text-left font-display text-[10px] font-semibold tracking-[.12em] text-brand-olive/60 uppercase">Geofence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-brown/6">
              {visits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[13px] text-brand-olive/40">
                    No visits recorded yet
                  </td>
                </tr>
              ) : (
                visits.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => router.push(`/visits/${v.id}`)}
                    className="cursor-pointer transition-colors hover:bg-brand-brown/3"
                  >
                    <td className="px-4 py-3 text-[13px] text-brand-brown">{formatDate(v.visitDate)}</td>
                    <td className="px-4 py-3 text-[13px] text-brand-olive">{v.purpose.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                    <td className="px-4 py-3 font-mono text-[12px] text-brand-olive">{v.durationMinutes ? `${v.durationMinutes}m` : "—"}</td>
                    <td className="px-4 py-3 text-[12px]">
                      {v.geofenceValidation ? (
                        v.geofenceValidation.isWithinGeofence
                          ? <span className="font-semibold text-success">✓ Valid</span>
                          : <span className="font-semibold text-danger">✕ Invalid</span>
                      ) : (
                        <span className="text-brand-olive/30">—</span>
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
