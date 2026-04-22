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

const INPUT_CLS = "w-full rounded-sm border border-brand-brown/20 px-3 py-2 text-sm text-brand-brown bg-white focus:border-brand-tan focus:outline-none focus:ring-1 focus:ring-brand-tan/20";
const LABEL_CLS = "mb-1 block font-display text-[11px] font-semibold tracking-[.12em] text-brand-olive/50 uppercase";

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
    formData.forEach((value, key) => { body[key] = key === "meshApplied" ? value === "on" : value; });
    try {
      const res = await fetch("/api/production/epoxy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const data = await res.json(); setError(data.error || "Failed to create entry"); return; }
      router.push("/production/epoxy");
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-[28px] font-bold leading-tight text-brand-brown">New Epoxy / Vacuum Entry</h1>
        <p className="text-sm text-brand-olive/60">Record epoxy infusion and vacuum sealing details</p>
      </div>

      <form onSubmit={handleSubmit}>
        {error && <div className="mb-4 rounded-sm bg-danger/10 p-3 text-sm text-danger">{error}</div>}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><h2 className="font-display text-[15px] font-bold text-brand-brown">Slab & Machine</h2></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className={LABEL_CLS}>Select Slab *</label>
                  <select name="slabId" required className={INPUT_CLS}>
                    <option value="">Choose a slab</option>
                    {slabs.map((slab) => (
                      <option key={slab.id} value={slab.id}>
                        {slab.slabNumber} — {slab.block.variety} ({slab.block.color})
                      </option>
                    ))}
                  </select>
                  {slabs.length === 0 && (
                    <p className="mt-1 text-xs text-warning">No slabs ready for epoxy. Cut blocks in Gang Saw first.</p>
                  )}
                </div>
                <div>
                  <label className={LABEL_CLS}>Machine *</label>
                  <select name="machineId" required className={INPUT_CLS}>
                    <option value="">Select machine</option>
                    {machines.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS}>Start Time *</label>
                  <input type="datetime-local" name="startTime" required className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>End Time</label>
                  <input type="datetime-local" name="endTime" className={INPUT_CLS} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h2 className="font-display text-[15px] font-bold text-brand-brown">Epoxy Details</h2></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className={LABEL_CLS}>Epoxy Type</label>
                  <select name="epoxyType" className={INPUT_CLS}>
                    <option value="">Select type</option>
                    <option value="Standard">Standard</option>
                    <option value="Premium">Premium</option>
                    <option value="UV Resistant">UV Resistant</option>
                    <option value="Clear">Clear</option>
                    <option value="Colored">Colored</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS}>Epoxy Quantity (ml)</label>
                  <input type="number" name="epoxyQuantityMl" step="0.1" className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Vacuum Pressure (bar)</label>
                  <input type="number" name="vacuumPressure" step="0.01" className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Curing Time (minutes)</label>
                  <input type="number" name="curingTimeMin" className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Temperature (°C)</label>
                  <input type="number" name="temperatureC" step="0.1" className={INPUT_CLS} />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" name="meshApplied" id="meshApplied" className="rounded border-brand-brown/20 text-brand-tan" />
                  <label htmlFor="meshApplied" className="text-sm text-brand-olive/80">Fiber mesh applied</label>
                </div>
                <div>
                  <label className={LABEL_CLS}>Status</label>
                  <select name="status" className={INPUT_CLS}>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="CURING">Curing</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="FAILED">Failed</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS}>Quality Check</label>
                  <select name="qualityCheck" className={INPUT_CLS}>
                    <option value="">Pending</option>
                    <option value="PASS">Pass</option>
                    <option value="FAIL">Fail</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS}>Notes</label>
                  <textarea name="notes" rows={3} className={INPUT_CLS + " resize-none"} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="rounded-sm border border-brand-brown/20 px-6 py-2 text-sm font-medium text-brand-olive hover:bg-brand-brown/5">Cancel</button>
          <button type="submit" disabled={loading} className="rounded-sm bg-brand-brown px-6 py-2 font-display text-[13px] font-bold tracking-wide text-white hover:bg-brand-brown/90 disabled:opacity-50">
            {loading ? "Saving..." : "Save Entry"}
          </button>
        </div>
      </form>
    </div>
  );
}
