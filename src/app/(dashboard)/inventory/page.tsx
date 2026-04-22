"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";

interface InventoryItem {
  id: string;
  bundleNumber: string | null;
  rackLocation: string | null;
  status: string;
  reservedFor: string | null;
  soldPriceINR: number | null;
  createdAt: string;
  slab: {
    id: string;
    slabNumber: string;
    lengthCm: number;
    widthCm: number;
    thicknessMm: number;
    grade: string;
    finishType: string | null;
    block: { blockNumber: string; variety: string; color: string; type: string };
  };
  warehouse: { name: string };
}

interface SlabForInventory {
  id: string;
  slabNumber: string;
  currentStage: string;
  status: string;
  block: { variety: string; color: string };
}

const INPUT_CLS = "w-full rounded-sm border border-brand-brown/20 px-3 py-2 text-sm text-brand-brown bg-white focus:border-brand-tan focus:outline-none focus:ring-1 focus:ring-brand-tan/20";
const LABEL_CLS = "mb-1 block font-display text-[11px] font-semibold tracking-[.12em] text-brand-olive/50 uppercase";

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [availableSlabs, setAvailableSlabs] = useState<SlabForInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  const fetchData = () => {
    Promise.all([
      fetch("/api/inventory").then((r) => r.json()),
      fetch("/api/slabs?status=POLISHED").then((r) => r.json()),
    ]).then(([invData, slabData]) => {
      setItems(invData.items || []);
      setAvailableSlabs(slabData.slabs || []);
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddToInventory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddLoading(true);
    const formData = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    formData.forEach((value, key) => { body[key] = value as string; });
    try {
      const res = await fetch("/api/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) { setShowAddModal(false); fetchData(); }
    } catch { /* ignore */ }
    finally { setAddLoading(false); }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-tan border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-[28px] font-bold leading-tight text-brand-brown">Slab Inventory</h1>
          <p className="text-sm text-brand-olive/60">Track finished slabs in warehouse</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="w-fit rounded-sm bg-success px-4 py-2 font-display text-[13px] font-bold tracking-wide text-white transition-colors hover:bg-success/90"
        >
          + Add to Inventory
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Items", value: items.length, cls: "text-brand-brown" },
          { label: "In Stock", value: items.filter((i) => i.status === "IN_STOCK").length, cls: "text-success" },
          { label: "Reserved", value: items.filter((i) => i.status === "RESERVED").length, cls: "text-warning" },
          { label: "Sold", value: items.filter((i) => i.status === "SOLD").length, cls: "text-brand-tan-dark" },
        ].map(({ label, value, cls }) => (
          <div key={label} className="rounded-sm border border-brand-brown/10 bg-surface p-4 shadow-1">
            <p className="text-sm text-brand-olive/60">{label}</p>
            <p className={`text-2xl font-bold ${cls}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Inventory Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-brand-brown/10">
                  {["Slab #", "Variety", "Color", "Dimensions", "Grade", "Finish", "Warehouse", "Bundle", "Location", "Status", "Date"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-display text-[10px] font-semibold tracking-[.12em] text-brand-olive/50 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-brown/8">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-sm text-brand-olive/60">
                      No inventory items yet. Complete slabs through production and add them here.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-brand-brown/3">
                      <td className="px-4 py-3 font-mono text-sm font-medium text-brand-tan-dark">{item.slab.slabNumber}</td>
                      <td className="px-4 py-3 text-sm text-brand-brown">{item.slab.block.variety}</td>
                      <td className="px-4 py-3 text-sm text-brand-brown">{item.slab.block.color}</td>
                      <td className="px-4 py-3 text-sm text-brand-brown">{item.slab.lengthCm} x {item.slab.widthCm} cm x {item.slab.thicknessMm}mm</td>
                      <td className="px-4 py-3 text-sm text-brand-brown">{item.slab.grade}</td>
                      <td className="px-4 py-3 text-sm text-brand-brown">{item.slab.finishType || "—"}</td>
                      <td className="px-4 py-3 text-sm text-brand-brown">{item.warehouse.name}</td>
                      <td className="px-4 py-3 text-sm text-brand-brown">{item.bundleNumber || "—"}</td>
                      <td className="px-4 py-3 text-sm text-brand-brown">{item.rackLocation || "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                      <td className="px-4 py-3 text-sm text-brand-olive/60">{formatDate(item.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add to Inventory Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <h2 className="font-display text-[15px] font-bold text-brand-brown">Add Slab to Inventory</h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddToInventory}>
                <div className="space-y-4">
                  <div>
                    <label className={LABEL_CLS}>Select Slab *</label>
                    <select name="slabId" required className={INPUT_CLS}>
                      <option value="">Choose a slab</option>
                      {availableSlabs.map((slab) => (
                        <option key={slab.id} value={slab.id}>{slab.slabNumber} — {slab.block.variety}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Warehouse *</label>
                    <input type="text" name="warehouseId" placeholder="Enter warehouse ID" required className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Bundle Number</label>
                    <input type="text" name="bundleNumber" className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Rack Location</label>
                    <input type="text" name="rackLocation" placeholder="e.g., A-3-2" className={INPUT_CLS} />
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="rounded-sm border border-brand-brown/20 px-4 py-2 text-sm text-brand-olive hover:bg-brand-brown/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="rounded-sm bg-success px-4 py-2 font-display text-[13px] font-bold text-white hover:bg-success/90 disabled:opacity-50"
                  >
                    {addLoading ? "Adding..." : "Add to Inventory"}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
