"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

interface Slab {
  id: string;
  slabNumber: string;
  block: { blockNumber: string; variety: string; color: string };
}

interface Machine {
  id: string;
  name: string;
  code: string;
}

export default function NewEpoxyEntryPage() {
  const router = useRouter();
  const [slabs, setSlabs] = useState<Slab[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/slabs?currentStage=EPOXY").then((r) => r.json()),
      fetch("/api/machines?type=EPOXY_LINE").then((r) => r.json()),
    ]).then(([slabData, machineData]) => {
      setSlabs(slabData.slabs || []);
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
      if (key === "meshApplied") {
        body[key] = value === "on";
      } else {
        body[key] = value;
      }
    });

    try {
      const res = await fetch("/api/production/epoxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create entry");
        return;
      }

      router.push("/production/epoxy");
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
          New Epoxy / Vacuum Entry
        </h1>
        <p className="text-sm text-stone-500">
          Record epoxy infusion and vacuum sealing details
        </p>
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
              <h2 className="font-semibold text-stone-900">Slab & Machine</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    Select Slab *
                  </label>
                  <select
                    name="slabId"
                    required
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">Choose a slab</option>
                    {slabs.map((slab) => (
                      <option key={slab.id} value={slab.id}>
                        {slab.slabNumber} - {slab.block.variety} ({slab.block.color})
                      </option>
                    ))}
                  </select>
                  {slabs.length === 0 && (
                    <p className="mt-1 text-xs text-amber-600">
                      No slabs ready for epoxy. Cut blocks in Gang Saw first.
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    Machine *
                  </label>
                  <select
                    name="machineId"
                    required
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
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
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    name="endTime"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-semibold text-stone-900">Epoxy Details</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    Epoxy Type
                  </label>
                  <select
                    name="epoxyType"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">Select type</option>
                    <option value="Standard">Standard</option>
                    <option value="Premium">Premium</option>
                    <option value="UV Resistant">UV Resistant</option>
                    <option value="Clear">Clear</option>
                    <option value="Colored">Colored</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    Epoxy Quantity (ml)
                  </label>
                  <input
                    type="number"
                    name="epoxyQuantityMl"
                    step="0.1"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    Vacuum Pressure (bar)
                  </label>
                  <input
                    type="number"
                    name="vacuumPressure"
                    step="0.01"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    Curing Time (minutes)
                  </label>
                  <input
                    type="number"
                    name="curingTimeMin"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    Temperature (°C)
                  </label>
                  <input
                    type="number"
                    name="temperatureC"
                    step="0.1"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="meshApplied"
                    id="meshApplied"
                    className="rounded border-stone-300 text-purple-600"
                  />
                  <label htmlFor="meshApplied" className="text-sm text-stone-700">
                    Fiber mesh applied
                  </label>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    Status
                  </label>
                  <select
                    name="status"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="CURING">Curing</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="FAILED">Failed</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    Quality Check
                  </label>
                  <select
                    name="qualityCheck"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">Pending</option>
                    <option value="PASS">Pass</option>
                    <option value="FAIL">Fail</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    rows={3}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
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
            className="rounded-lg bg-purple-600 px-6 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Entry"}
          </button>
        </div>
      </form>
    </div>
  );
}
