"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

interface Block {
  id: string;
  blockNumber: string;
  variety: string;
  color: string;
  status: string;
}

interface Machine {
  id: string;
  name: string;
  code: string;
}

export default function NewGangSawEntryPage() {
  const router = useRouter();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/blocks?status=RECEIVED").then((r) => r.json()),
      fetch("/api/machines?type=GANG_SAW").then((r) => r.json()),
    ]).then(([blockData, machineData]) => {
      // Include blocks that are RECEIVED or PARTIALLY_CUT
      fetch("/api/blocks?status=PARTIALLY_CUT")
        .then((r) => r.json())
        .then((partialData) => {
          setBlocks([...(blockData.blocks || []), ...(partialData.blocks || [])]);
        });
      setMachines(machineData.machines || []);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {};
    formData.forEach((value, key) => {
      if (key === "blockFullyCut") {
        body[key] = value === "on";
      } else {
        body[key] = value;
      }
    });

    try {
      const res = await fetch("/api/production/gang-saw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create entry");
        return;
      }

      router.push("/production/gang-saw");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">
          New Gang Saw Entry
        </h1>
        <p className="text-sm text-stone-500">Record block cutting details</p>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-stone-900">Block & Machine</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    Select Block *
                  </label>
                  <select
                    name="blockId"
                    required
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Choose a block</option>
                    {blocks.map((block) => (
                      <option key={block.id} value={block.id}>
                        {block.blockNumber} - {block.variety} ({block.color}) [{block.status}]
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    Machine *
                  </label>
                  <select
                    name="machineId"
                    required
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select machine</option>
                    {machines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    name="startTime"
                    required
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    name="endTime"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-semibold text-stone-900">Cutting Details</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    Number of Slabs *
                  </label>
                  <input
                    type="number"
                    name="numberOfSlabs"
                    min="1"
                    required
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    Slab Thickness (mm)
                  </label>
                  <input
                    type="number"
                    name="slabThicknessMm"
                    defaultValue="18"
                    step="0.1"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    Blades Used
                  </label>
                  <input
                    type="number"
                    name="bladesUsed"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    Wastage (kg)
                  </label>
                  <input
                    type="number"
                    name="wastageKg"
                    step="0.1"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    Power Consumption (kWh)
                  </label>
                  <input
                    type="number"
                    name="powerConsumptionKwh"
                    step="0.1"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    Status
                  </label>
                  <select
                    name="status"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="PAUSED">Paused</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="blockFullyCut"
                    id="blockFullyCut"
                    className="rounded border-stone-300 text-blue-600"
                  />
                  <label htmlFor="blockFullyCut" className="text-sm text-stone-700">
                    Block fully cut (no material remaining)
                  </label>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    rows={3}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-stone-300 px-6 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Entry"}
          </button>
        </div>
      </form>
    </div>
  );
}
