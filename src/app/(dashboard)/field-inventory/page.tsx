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
  White: "bg-white border border-stone-300",
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
        <h1 className="text-2xl font-bold text-stone-900">Field Inventory</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("grid")}
            className={`rounded-lg p-2 text-sm ${viewMode === "grid" ? "bg-brand-accent text-white" : "bg-stone-100 text-stone-600"}`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`rounded-lg p-2 text-sm ${viewMode === "list" ? "bg-brand-accent text-white" : "bg-stone-100 text-stone-600"}`}
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
            className="flex-1 min-w-[200px] rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <select value={materialType} onChange={(e) => { setMaterialType(e.target.value); setPage(1); }} className="rounded-lg border border-stone-300 px-3 py-2 text-sm">
            <option value="">All Materials</option>
            {MATERIAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={finishType} onChange={(e) => { setFinishType(e.target.value); setPage(1); }} className="rounded-lg border border-stone-300 px-3 py-2 text-sm">
            <option value="">All Finishes</option>
            {FINISH_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={grade} onChange={(e) => { setGrade(e.target.value); setPage(1); }} className="rounded-lg border border-stone-300 px-3 py-2 text-sm">
            <option value="">All Grades</option>
            {GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
          </select>
        </div>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="flex h-32 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-accent border-t-transparent" />
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
                      <h3 className="font-semibold text-stone-900">{item.variety}</h3>
                      <p className="text-xs text-stone-500">{item.materialType}</p>
                    </div>
                    <span className="rounded bg-stone-100 px-1.5 py-0.5 text-xs font-bold text-stone-700">
                      {item.grade}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <span>{item.lengthCm}×{item.widthCm}cm</span>
                    <span>·</span>
                    <span>{item.thicknessMm}mm</span>
                    <span>·</span>
                    <span>{sqft(item)} sqft</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-brand-accent">
                      {formatCurrency(item.pricePerSqftINR)}/sqft
                    </span>
                    <StatusBadge status={item.status} />
                  </div>

                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <span>Qty: <strong className="text-stone-700">{item.quantityAvailable}</strong></span>
                    <span>{item.warehouseCode}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-stone-100 px-4 py-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setReserveModal(item.id); }}
                  className="w-full rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-200"
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
                <tr className="border-b border-stone-200">
                  {["SKU", "Variety", "Material", "Color", "Finish", "Grade", "Size", "Price/sqft", "Qty", "Warehouse", "Status", ""].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {items.map((item) => (
                  <tr key={item.id} onClick={() => router.push(`/field-inventory/${item.id}`)} className="cursor-pointer hover:bg-stone-50">
                    <td className="px-3 py-3 text-xs font-mono text-stone-600">{item.sku}</td>
                    <td className="px-3 py-3 text-sm font-medium text-stone-900">{item.variety}</td>
                    <td className="px-3 py-3 text-xs text-stone-600">{item.materialType}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`h-3 w-3 rounded-full ${COLOR_SWATCHES[item.color] || "bg-stone-200"}`} />
                        <span className="text-xs text-stone-600">{item.color}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-stone-600">{item.finishType}</td>
                    <td className="px-3 py-3 text-xs font-bold">{item.grade}</td>
                    <td className="px-3 py-3 text-xs text-stone-600">{item.lengthCm}×{item.widthCm}cm</td>
                    <td className="px-3 py-3 text-sm font-medium text-brand-accent">{formatCurrency(item.pricePerSqftINR)}</td>
                    <td className="px-3 py-3 text-sm text-stone-900">{item.quantityAvailable}</td>
                    <td className="px-3 py-3 text-xs text-stone-600">{item.warehouseCode}</td>
                    <td className="px-3 py-3"><StatusBadge status={item.status} /></td>
                    <td className="px-3 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); setReserveModal(item.id); }}
                        className="rounded bg-stone-100 px-2 py-1 text-xs text-stone-700 hover:bg-stone-200"
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
          <div className="p-12 text-center text-sm text-stone-500">No inventory items found matching your filters.</div>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm disabled:opacity-40">Previous</button>
          <span className="text-sm text-stone-600">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm disabled:opacity-40">Next</button>
        </div>
      )}

      {/* Reserve Modal */}
      {reserveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setReserveModal(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold text-stone-900">Reserve for Customer</h3>
            <input
              placeholder="Search customer name..."
              value={customerSearch}
              onChange={(e) => searchCustomers(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              autoFocus
            />
            <div className="mt-2 max-h-48 overflow-y-auto">
              {customers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => reserveItem(reserveModal, c.id)}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-stone-100"
                >
                  {c.businessName}
                </button>
              ))}
              {customerSearch.length >= 2 && customers.length === 0 && (
                <p className="px-3 py-2 text-sm text-stone-400">No customers found</p>
              )}
            </div>
            <button onClick={() => setReserveModal(null)} className="mt-4 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
