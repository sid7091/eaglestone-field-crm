"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import { api } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";

interface InventoryItem {
  id: string;
  sku: string;
  materialType: string;
  variety: string;
  color: string;
  finishType: string;
  grade: string;
  lengthCm: number;
  widthCm: number;
  thicknessMm: number;
  quantityAvailable: number;
  quantityReserved: number;
  pricePerSqftINR: number;
  landedCostPerSqftINR: number | null;
  warehouseCode: string;
  rackLocation: string | null;
  bundleNumber: string | null;
  blockReference: string | null;
  status: string;
  regionCode: string;
  reservedForCustomer: { id: string; businessName: string } | null;
  reservedDate: string | null;
  soldDate: string | null;
  notes: string | null;
  createdAt: string;
}

export default function InventoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<{ id: string; businessName: string }[]>([]);

  const fetchItem = useCallback(async () => {
    try {
      const data = await api.get<InventoryItem>(`/inventory/${id}`);
      setItem(data);
    } catch { /* handled below */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchItem(); }, [fetchItem]);

  async function searchCustomers(q: string) {
    setCustomerSearch(q);
    if (q.length < 2) { setCustomers([]); return; }
    try {
      const res = await api.get<{ data: { id: string; businessName: string }[] }>(`/customers?search=${encodeURIComponent(q)}&limit=5`);
      setCustomers(res.data);
    } catch { /* ignore */ }
  }

  async function reserveItem(customerId: string) {
    try {
      await api.post(`/inventory/${id}/reserve`, { customerId });
      fetchItem();
      setReserving(false);
      setCustomerSearch("");
    } catch { alert("Failed to reserve"); }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-tan border-t-transparent" />
      </div>
    );
  }

  if (!item) {
    return <Card><div className="p-8 text-center text-brand-olive/60">Item not found</div></Card>;
  }

  const sqft = ((item.lengthCm * item.widthCm) / 929.0304).toFixed(1);
  const totalValue = item.pricePerSqftINR * parseFloat(sqft) * item.quantityAvailable;

  const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
      <dt className="font-display text-[10px] font-semibold tracking-[.12em] text-brand-olive/50 uppercase">{label}</dt>
      <dd className="mt-1 text-[13px] text-brand-brown">{value || "—"}</dd>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <button onClick={() => router.push("/field-inventory")} className="mb-2 font-display text-[11px] font-semibold tracking-wide text-brand-olive/50 hover:text-brand-olive">
            ← BACK TO INVENTORY
          </button>
          <h1 className="font-display text-[28px] font-bold leading-tight text-brand-brown">{item.variety}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-brand-olive/60">
            <span className="font-mono">{item.sku}</span>
            <StatusBadge status={item.status} />
            <span className="rounded bg-brand-brown/8 px-1.5 py-0.5 text-xs font-bold text-brand-olive">Grade {item.grade}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-brand-tan-dark">{formatCurrency(item.pricePerSqftINR)}<span className="text-sm font-normal text-brand-olive/60">/sqft</span></p>
          <p className="text-xs text-brand-olive/60">Total value: {formatCurrency(totalValue)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Specifications */}
        <Card className="lg:col-span-2">
          <div className="border-b border-brand-brown/10 px-6 py-4">
            <h2 className="font-display text-[15px] font-bold text-brand-brown">Specifications</h2>
          </div>
          <div className="grid grid-cols-2 gap-6 p-6 sm:grid-cols-3">
            <Field label="Material Type" value={item.materialType} />
            <Field label="Variety" value={item.variety} />
            <Field label="Color" value={item.color} />
            <Field label="Finish" value={item.finishType} />
            <Field label="Grade" value={item.grade} />
            <Field label="Length" value={`${item.lengthCm} cm`} />
            <Field label="Width" value={`${item.widthCm} cm`} />
            <Field label="Thickness" value={`${item.thicknessMm} mm`} />
            <Field label="Area per piece" value={`${sqft} sqft`} />
            <Field label="Block Reference" value={item.blockReference} />
            <Field label="Bundle Number" value={item.bundleNumber} />
            <Field label="Region" value={item.regionCode} />
          </div>
        </Card>

        {/* Stock & Warehouse */}
        <div className="space-y-6">
          <Card>
            <div className="border-b border-brand-brown/10 px-6 py-4">
              <h2 className="font-display text-[15px] font-bold text-brand-brown">Stock</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-brand-olive/60">Available</span>
                <span className="text-2xl font-bold text-success">{item.quantityAvailable}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-brand-olive/60">Reserved</span>
                <span className="text-lg font-semibold text-warning">{item.quantityReserved}</span>
              </div>
              {item.landedCostPerSqftINR && (
                <div className="flex items-center justify-between border-t border-brand-brown/6 pt-3">
                  <span className="text-sm text-brand-olive/60">Landed Cost</span>
                  <span className="text-sm font-medium">{formatCurrency(item.landedCostPerSqftINR)}/sqft</span>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="border-b border-brand-brown/10 px-6 py-4">
              <h2 className="font-display text-[15px] font-bold text-brand-brown">Warehouse</h2>
            </div>
            <div className="p-6 space-y-3">
              <Field label="Warehouse" value={item.warehouseCode} />
              <Field label="Rack Location" value={item.rackLocation} />
              <Field label="Listed Since" value={formatDate(item.createdAt)} />
            </div>
          </Card>
        </div>
      </div>

      {/* Reservation Section */}
      <Card>
        <div className="border-b border-brand-brown/10 px-6 py-4">
          <h2 className="font-display text-[15px] font-bold text-brand-brown">Reservation</h2>
        </div>
        <div className="p-6">
          {item.reservedForCustomer ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-brand-brown">
                  Reserved for: <strong>{item.reservedForCustomer.businessName}</strong>
                </p>
                {item.reservedDate && (
                  <p className="text-xs text-brand-olive/60 mt-1">Reserved on {formatDate(item.reservedDate)}</p>
                )}
              </div>
              <button
                onClick={() => router.push(`/customers/${item.reservedForCustomer!.id}`)}
                className="rounded-sm border border-brand-brown/20 px-3 py-1.5 text-sm text-brand-olive hover:bg-brand-brown/3"
              >
                View Customer
              </button>
            </div>
          ) : item.status === "IN_STOCK" ? (
            reserving ? (
              <div className="space-y-3">
                <input
                  placeholder="Search customer name..."
                  value={customerSearch}
                  onChange={(e) => searchCustomers(e.target.value)}
                  className="w-full rounded-sm border border-brand-brown/20 px-3 py-2 text-sm"
                  autoFocus
                />
                <div className="max-h-40 overflow-y-auto rounded-sm border border-brand-brown/10">
                  {customers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => reserveItem(c.id)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-brand-brown/3 border-b border-brand-brown/6 last:border-0"
                    >
                      {c.businessName}
                    </button>
                  ))}
                  {customerSearch.length >= 2 && customers.length === 0 && (
                    <p className="px-3 py-2 text-sm text-brand-olive/40">No customers found</p>
                  )}
                </div>
                <button onClick={() => { setReserving(false); setCustomerSearch(""); }} className="text-sm text-brand-olive/60 hover:text-brand-olive">
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setReserving(true)}
                className="rounded-sm bg-brand-brown px-4 py-2 text-sm font-medium text-white hover:bg-brand-brown/90"
              >
                Reserve for Customer
              </button>
            )
          ) : (
            <p className="text-sm text-brand-olive/60">This item is not available for reservation.</p>
          )}
        </div>
      </Card>

      {/* Notes */}
      {item.notes && (
        <Card>
          <div className="border-b border-brand-brown/10 px-6 py-4">
            <h2 className="font-display text-[15px] font-bold text-brand-brown">Notes</h2>
          </div>
          <div className="p-6 text-sm text-brand-olive whitespace-pre-wrap">{item.notes}</div>
        </Card>
      )}
    </div>
  );
}
