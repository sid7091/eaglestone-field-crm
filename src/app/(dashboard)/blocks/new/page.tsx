"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import {
  BLOCK_TYPES,
  MARBLE_COLORS,
  MARBLE_VARIETIES,
  ORIGINS,
  GRADES,
} from "@/lib/utils";

const INPUT_CLS = "w-full rounded-sm border border-brand-brown/20 px-3 py-2 text-sm text-brand-brown bg-white focus:border-brand-tan focus:outline-none focus:ring-1 focus:ring-brand-tan/20";
const LABEL_CLS = "mb-1 block font-display text-[11px] font-semibold tracking-[.12em] text-brand-olive/50 uppercase";

export default function NewBlockPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {};
    formData.forEach((value, key) => { body[key] = value; });
    try {
      const res = await fetch("/api/blocks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const data = await res.json(); setError(data.error || "Failed to create block"); return; }
      router.push("/blocks");
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-[28px] font-bold leading-tight text-brand-brown">Add New Block</h1>
        <p className="text-sm text-brand-olive/60">Register a new raw marble block</p>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 rounded-sm bg-danger/10 p-3 text-sm text-danger">{error}</div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Block Details */}
          <Card>
            <CardHeader>
              <h2 className="font-display text-[15px] font-bold text-brand-brown">Block Details</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className={LABEL_CLS}>Type *</label>
                  <select name="type" required className={INPUT_CLS}>
                    <option value="">Select type</option>
                    {BLOCK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS}>Variety *</label>
                  <select name="variety" required className={INPUT_CLS}>
                    <option value="">Select variety</option>
                    {MARBLE_VARIETIES.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS}>Color *</label>
                  <select name="color" required className={INPUT_CLS}>
                    <option value="">Select color</option>
                    {MARBLE_COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS}>Origin *</label>
                  <select name="origin" required className={INPUT_CLS}>
                    <option value="">Select origin</option>
                    {ORIGINS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS}>Grade</label>
                  <select name="grade" className={INPUT_CLS}>
                    {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS}>Quarry Name</label>
                  <input type="text" name="quarryName" className={INPUT_CLS} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dimensions & Supplier */}
          <Card>
            <CardHeader>
              <h2 className="font-display text-[15px] font-bold text-brand-brown">Dimensions & Supplier</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={LABEL_CLS}>Length (cm) *</label>
                    <input type="number" name="lengthCm" step="0.1" required className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Width (cm) *</label>
                    <input type="number" name="widthCm" step="0.1" required className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Height (cm) *</label>
                    <input type="number" name="heightCm" step="0.1" required className={INPUT_CLS} />
                  </div>
                </div>
                <div>
                  <label className={LABEL_CLS}>Weight (kg) *</label>
                  <input type="number" name="weightKg" step="0.1" required className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Supplier Name *</label>
                  <input type="text" name="supplierName" required className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Arrival Date *</label>
                  <input type="date" name="arrivalDate" required className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Landed Cost (INR)</label>
                  <input type="number" name="landedCostINR" step="1" className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Import Batch No.</label>
                  <input type="text" name="importBatchNo" className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Vehicle Number</label>
                  <input type="text" name="vehicleNumber" className={INPUT_CLS} />
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
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-sm border border-brand-brown/20 px-6 py-2 text-sm font-medium text-brand-olive hover:bg-brand-brown/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-sm bg-brand-brown px-6 py-2 font-display text-[13px] font-bold tracking-wide text-white hover:bg-brand-brown/90 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Block"}
          </button>
        </div>
      </form>
    </div>
  );
}
