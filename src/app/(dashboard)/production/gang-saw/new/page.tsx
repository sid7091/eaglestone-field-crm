"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

interface Block { id: string; blockNumber: string; variety: string; color: string; status: string; }
interface Machine { id: string; name: string; code: string; }

const INPUT_CLS = "w-full rounded-sm border border-brand-brown/20 px-3 py-2 text-sm text-brand-brown bg-white focus:border-brand-tan focus:outline-none focus:ring-1 focus:ring-brand-tan/20";
const LABEL_CLS = "mb-1 block font-display text-[11px] font-semibold tracking-[.12em] text-brand-olive/50 uppercase";

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
      fetch("/api/blocks?status=PARTIALLY_CUT")
        .then((r) => r.json())
        .then((partialData) => { setBlocks([...(blockData.blocks || []), ...(partialData.blocks || [])]); });
      setMachines(machineData.machines || []);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {};
    formData.forEach((value, key) => { body[key] = key === "blockFullyCut" ? value === "on" : value; });
    try {
      const res = await fetch("/api/production/gang-saw", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const data = await res.json(); setError(data.error || "Failed to create entry"); return; }
      router.push("/production/gang-saw");
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-[28px] font-bold leading-tight text-brand-brown">New Gang Saw Entry</h1>
        <p className="text-sm text-brand-olive/60">Record block cutting details</p>
      </div>

      <form onSubmit={handleSubmit}>
        {error && <div className="mb-4 rounded-sm bg-danger/10 p-3 text-sm text-danger">{error}</div>}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><h2 className="font-display text-[15px] font-bold text-brand-brown">Block & Machine</h2></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className={LABEL_CLS}>Select Block *</label>
                  <select name="blockId" required className={INPUT_CLS}>
                    <option value="">Choose a block</option>
                    {blocks.map((block) => (
                      <option key={block.id} value={block.id}>{block.blockNumber} — {block.variety} ({block.color}) [{block.status}]</option>
                    ))}
                  </select>
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
            <CardHeader><h2 className="font-display text-[15px] font-bold text-brand-brown">Cutting Details</h2></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className={LABEL_CLS}>Number of Slabs *</label>
                  <input type="number" name="numberOfSlabs" min="1" required className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Slab Thickness (mm)</label>
                  <input type="number" name="slabThicknessMm" defaultValue="18" step="0.1" className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Blades Used</label>
                  <input type="number" name="bladesUsed" className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Wastage (kg)</label>
                  <input type="number" name="wastageKg" step="0.1" className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Power Consumption (kWh)</label>
                  <input type="number" name="powerConsumptionKwh" step="0.1" className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Status</label>
                  <select name="status" className={INPUT_CLS}>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="PAUSED">Paused</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" name="blockFullyCut" id="blockFullyCut" className="rounded border-brand-brown/20 text-brand-tan" />
                  <label htmlFor="blockFullyCut" className="text-sm text-brand-olive/80">Block fully cut (no material remaining)</label>
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
