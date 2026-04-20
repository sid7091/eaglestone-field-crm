"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";

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
  warehouseCode: string;
  rackLocation: string | null;
  status: string;
  regionCode: string;
}

interface PaginatedResponse {
  data: InventoryItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const COLOR_SWATCHES: Record<string, string> = {
  White: "bg-white border border-brand-brown/20",
  Beige: "bg-amber-50",
  Grey: "bg-stone-400",
  Black: "bg-stone-900",
  Brown: "bg-amber-800",
  Green: "bg-emerald-700",
  Pink: "bg-pink-300",
  Red: "bg-red-700",
  Blue: "bg-blue-600",
  Gold: "bg-amber-400",
  Cream: "bg-amber-100",
  Multi: "bg-gradient-to-r from-red-400 via-yellow-400 to-blue-400",
};

const MATERIAL_TYPES = [
  "Italian Marble", "Indian Marble", "Turkish Marble", "Granite", "Onyx", "Travertine", "Quartzite",
];
const FINISH_TYPES = ["POLISHED", "HONED", "LEATHER", "BRUSHED", "FLAMED"];
const GRADES = ["A", "B", "C", "D"];

export default function FieldInventoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [materialType, setMaterialType] = useState("");
  const [finishType, setFinishType] = useState("");
  const [grade, setGrade] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [reserveModal, setReserveModal] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<{ id: string; businessName: string }[]>([]);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "24" });
      if (search) params.set("search", search);
      if (materialType) params.set("materialType", materialType);
      if (finishType) params.set("finishType", finishType);
      if (grade) params.set("grade", grade);
      params.set("status", "IN_STOCK");

      const res = await api.get<PaginatedResponse>(`/inventory?${params}`);
      setItems(res.data);
      setTotalPages(res.meta.totalPages);
    } catch {
      /* offline or error */
    } finally {
      setLoading(false);
    }
  }, [page, search, materialType, finishType, grade]);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  async function searchCustomers(q: string) {
    setCustomerSearch(q);
    if (q.length < 2) { setCustomers([]); return; }
    try {
      const res = await api.get<{ data: { id: string; businessName: string }[] }>(`/customers?search=${encodeURIComponent(q)}&limit=5`);
      setCustomers(res.data);
    } catch { /* ignore */ }
  }

  async function reserveItem(itemId: string, customerId: string) {
    try {
      await api.post(`/inventory/${itemId}/reserve`, { customerId });
      setReserveModal(null);
      fetchInventory();
    } catch {
      alert("Failed to reserve item");
    }
  }

  const sqft = (item: InventoryItem) =>
    ((item.lengthCm * item.widthCm) / 929.0304).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-display text-[10px] font-semibold tracking-[.2em] text-brand-olive/50">OPERATIONS</p>
          <h1 className="mt-1 font-display text-[28px] font-bold leading-tight text-brand-brown">Field Inventory</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("grid")}
            className={`rounded-sm p-2 text-sm ${viewMode === "grid" ? "bg-brand-brown text-brand-cream" : "bg-brand-brown/8 text-brand-olive"}`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`rounded-sm p-2 text-sm ${viewMode === "list" ? "bg-brand-brown text-brand-cream" : "bg-brand-brown/8 text-brand-olive"}`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3 p-4">
          <input
            placeholder="Search SKU or variety..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 min-w-[200px] rounded-sm border border-brand-brown/20 px-3 py-2 text-sm"
          />
          <select value={materialType} onChange={(e) => { setMaterialType(e.target.value); setPage(1); }} className="rounded-sm border border-brand-brown/20 px-3 py-2 text-sm">
            <option value="">All Materials</option>
            {MATERIAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={finishType} onChange={(e) => { setFinishType(e.target.value); setPage(1); }} className="rounded-sm border border-brand-brown/20 px-3 py-2 text-sm">
            <option value="">All Finishes</option>
            {FINISH_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={grade} onChange={(e) => { setGrade(e.target.value); setPage(1); }} className="rounded-sm border border-brand-brown/20 px-3 py-2 text-sm">
            <option value="">All Grades</option>
            {GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
          </select>
        </div>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="flex h-32 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-tan border-t-transparent" />
        </div>
      )}

      {/* Grid View */}
      {!loading && viewMode === "grid" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden transition-shadow hover:shadow-lg">
              <div
                className="cursor-pointer"
                onClick={() => router.push(`/field-inventory/${item.id}`)}
              >
                {/* Color header */}
                <div className={`h-3 ${COLOR_SWATCHES[item.color] || "bg-stone-200"}`} />
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-brand-brown">{item.variety}</h3>
                      <p className="text-xs text-brand-olive/60">{item.materialType}</p>
                    </div>
                    <span className="rounded bg-brand-brown/8 px-1.5 py-0.5 text-xs font-bold text-brand-olive">
                      {item.grade}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-brand-olive/60">
                    <span>{item.lengthCm}×{item.widthCm}cm</span>
                    <span>·</span>
                    <span>{item.thicknessMm}mm</span>
                    <span>·</span>
                    <span>{sqft(item)} sqft</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-brand-tan-dark">
                      {formatCurrency(item.pricePerSqftINR)}/sqft
                    </span>
                    <StatusBadge status={item.status} />
                  </div>

                  <div className="flex items-center justify-between text-xs text-brand-olive/60">
                    <span>Qty: <strong className="text-brand-olive">{item.quantityAvailable}</strong></span>
                    <span>{item.warehouseCode}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-brand-brown/6 px-4 py-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setReserveModal(item.id); }}
                  className="w-full rounded-sm bg-brand-brown/8 px-3 py-1.5 text-xs font-medium text-brand-olive hover:bg-brand-brown/12"
                >
                  Reserve for Customer
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* List View */}
      {!loading && viewMode === "list" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-brand-brown/10">
                  {["SKU", "Variety", "Material", "Color", "Finish", "Grade", "Size", "Price/sqft", "Qty", "Warehouse", "Status", ""].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-brand-olive/60">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-brown/6">
                {items.map((item) => (
                  <tr key={item.id} onClick={() => router.push(`/field-inventory/${item.id}`)} className="cursor-pointer hover:bg-brand-brown/3">
                    <td className="px-3 py-3 text-xs font-mono text-brand-olive">{item.sku}</td>
                    <td className="px-3 py-3 text-sm font-medium text-brand-brown">{item.variety}</td>
                    <td className="px-3 py-3 text-xs text-brand-olive">{item.materialType}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`h-3 w-3 rounded-full ${COLOR_SWATCHES[item.color] || "bg-stone-200"}`} />
                        <span className="text-xs text-brand-olive">{item.color}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-brand-olive">{item.finishType}</td>
                    <td className="px-3 py-3 text-xs font-bold">{item.grade}</td>
                    <td className="px-3 py-3 text-xs text-brand-olive">{item.lengthCm}×{item.widthCm}cm</td>
                    <td className="px-3 py-3 text-sm font-medium text-brand-tan-dark">{formatCurrency(item.pricePerSqftINR)}</td>
                    <td className="px-3 py-3 text-sm text-brand-brown">{item.quantityAvailable}</td>
                    <td className="px-3 py-3 text-xs text-brand-olive">{item.warehouseCode}</td>
                    <td className="px-3 py-3"><StatusBadge status={item.status} /></td>
                    <td className="px-3 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); setReserveModal(item.id); }}
                        className="rounded bg-brand-brown/8 px-2 py-1 text-xs text-brand-olive hover:bg-brand-brown/12"
                      >
                        Reserve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {!loading && items.length === 0 && (
        <Card>
          <div className="p-12 text-center text-sm text-brand-olive/60">No inventory items found matching your filters.</div>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-sm border border-brand-brown/20 px-3 py-1.5 text-sm disabled:opacity-40">Previous</button>
          <span className="text-sm text-brand-olive">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-sm border border-brand-brown/20 px-3 py-1.5 text-sm disabled:opacity-40">Next</button>
        </div>
      )}

      {/* Reserve Modal */}
      {reserveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setReserveModal(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold text-brand-brown">Reserve for Customer</h3>
            <input
              placeholder="Search customer name..."
              value={customerSearch}
              onChange={(e) => searchCustomers(e.target.value)}
              className="w-full rounded-sm border border-brand-brown/20 px-3 py-2 text-sm"
              autoFocus
            />
            <div className="mt-2 max-h-48 overflow-y-auto">
              {customers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => reserveItem(reserveModal, c.id)}
                  className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-brand-brown/8"
                >
                  {c.businessName}
                </button>
              ))}
              {customerSearch.length >= 2 && customers.length === 0 && (
                <p className="px-3 py-2 text-sm text-brand-olive/40">No customers found</p>
              )}
            </div>
            <button onClick={() => setReserveModal(null)} className="mt-4 w-full rounded-sm border border-brand-brown/20 px-3 py-2 text-sm text-brand-olive hover:bg-brand-brown/3">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
