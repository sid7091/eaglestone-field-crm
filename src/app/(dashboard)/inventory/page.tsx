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
    block: {
      blockNumber: string;
      variety: string;
      color: string;
      type: string;
    };
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

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddToInventory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddLoading(true);

    const formData = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    formData.forEach((value, key) => {
      body[key] = value as string;
    });

    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setShowAddModal(false);
        fetchData();
      }
    } catch {
      // ignore
    } finally {
      setAddLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Slab Inventory
          </h1>
          <p className="text-sm text-gray-500">
            Track finished slabs in warehouse
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700"
        >
          + Add to Inventory
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Items</p>
          <p className="text-2xl font-bold text-gray-900">{items.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">In Stock</p>
          <p className="text-2xl font-bold text-green-600">
            {items.filter((i) => i.status === "IN_STOCK").length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Reserved</p>
          <p className="text-2xl font-bold text-yellow-600">
            {items.filter((i) => i.status === "RESERVED").length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Sold</p>
          <p className="text-2xl font-bold text-blue-600">
            {items.filter((i) => i.status === "SOLD").length}
          </p>
        </div>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Slab #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Variety</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Color</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Dimensions</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Grade</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Finish</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Warehouse</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Bundle</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-sm text-gray-500">
                      No inventory items yet. Complete slabs through production and add them here.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-amber-700">
                        {item.slab.slabNumber}
                      </td>
                      <td className="px-4 py-3 text-sm">{item.slab.block.variety}</td>
                      <td className="px-4 py-3 text-sm">{item.slab.block.color}</td>
                      <td className="px-4 py-3 text-sm">
                        {item.slab.lengthCm} x {item.slab.widthCm} cm x {item.slab.thicknessMm}mm
                      </td>
                      <td className="px-4 py-3 text-sm">{item.slab.grade}</td>
                      <td className="px-4 py-3 text-sm">{item.slab.finishType || "-"}</td>
                      <td className="px-4 py-3 text-sm">{item.warehouse.name}</td>
                      <td className="px-4 py-3 text-sm">{item.bundleNumber || "-"}</td>
                      <td className="px-4 py-3 text-sm">{item.rackLocation || "-"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(item.createdAt)}
                      </td>
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
              <h2 className="font-semibold text-gray-900">Add Slab to Inventory</h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddToInventory}>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Select Slab *
                    </label>
                    <select
                      name="slabId"
                      required
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="">Choose a slab</option>
                      {availableSlabs.map((slab) => (
                        <option key={slab.id} value={slab.id}>
                          {slab.slabNumber} - {slab.block.variety}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Warehouse *
                    </label>
                    <input
                      type="text"
                      name="warehouseId"
                      placeholder="Enter warehouse ID"
                      required
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Bundle Number
                    </label>
                    <input
                      type="text"
                      name="bundleNumber"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Rack Location
                    </label>
                    <input
                      type="text"
                      name="rackLocation"
                      placeholder="e.g., A-3-2"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
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
