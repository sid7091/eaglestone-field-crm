"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { FINISH_TYPES } from "@/lib/utils";

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

export default function NewPolishingEntryPage() {
  const router = useRouter();
  const [slabs, setSlabs] = useState<Slab[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/slabs?currentStage=POLISHING").then((r) => r.json()),
      fetch("/api/machines?type=POLISHING_MACHINE").then((r) => r.json()),
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
    formData.forEach((value, key) => { body[key] = value; });
    try {
      const res = await fetch("/api/production/polishing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const data = await res.json(); setError(data.error || "Failed to create entry"); return; }
      router.push("/production/polishing");
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-[28px] font-bold leading-tight text-brand-brown">New Polishing Entry</h1>
        <p className="text-sm text-brand-olive/60">Record polishing details</p>
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
                    <p className="mt-1 text-xs text-warning">No slabs ready for polishing. Complete epoxy stage first.</p>
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
            <CardHeader><h2 className="font-display text-[15px] font-bold text-brand-brown">Polishing Details</h2></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className={LABEL_CLS}>Finish Type</label>
                  <select name="finishType" className={INPUT_CLS}>
                    {FINISH_TYPES.map((f) => (
                      <option key={f} value={f.toUpperCase()}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS}>Gloss Level (0–100)</label>
                  <input type="number" name="glossLevel" min="0" max="100" className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Abrasives Used</label>
                  <input type="text" name="abrasivesUsed" placeholder="e.g., 120, 220, 400, 800, 1500 grit" className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Abrasives Cost (INR)</label>
                  <input type="number" name="abrasivesCostINR" step="1" className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Status</label>
                  <select name="status" className={INPUT_CLS}>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="REWORK_NEEDED">Rework Needed</option>
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
