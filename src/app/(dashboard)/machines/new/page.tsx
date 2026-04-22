"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

const INPUT_CLS = "w-full rounded-sm border border-brand-brown/20 px-3 py-2 text-sm text-brand-brown bg-white focus:border-brand-tan focus:outline-none focus:ring-1 focus:ring-brand-tan/20";
const LABEL_CLS = "mb-1 block font-display text-[11px] font-semibold tracking-[.12em] text-brand-olive/50 uppercase";

export default function NewMachinePage() {
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
      const res = await fetch("/api/machines", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const data = await res.json(); setError(data.error || "Failed to create machine"); return; }
      router.push("/machines");
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-[28px] font-bold leading-tight text-brand-brown">Add New Machine</h1>
        <p className="text-sm text-brand-olive/60">Register a new factory machine</p>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 rounded-sm bg-danger/10 p-3 text-sm text-danger">{error}</div>
        )}

        <Card className="max-w-xl">
          <CardHeader>
            <h2 className="font-display text-[15px] font-bold text-brand-brown">Machine Details</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className={LABEL_CLS}>Machine Name *</label>
                <input type="text" name="name" required placeholder="e.g., Gang Saw 1" className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Machine Code *</label>
                <input type="text" name="code" required placeholder="e.g., GS-01" className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Machine Type *</label>
                <select name="type" required className={INPUT_CLS}>
                  <option value="">Select type</option>
                  <option value="GANG_SAW">Gang Saw</option>
                  <option value="EPOXY_LINE">Epoxy / Vacuum Line</option>
                  <option value="POLISHING_MACHINE">Polishing Machine</option>
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Manufacturer</label>
                <input type="text" name="manufacturer" className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Model</label>
                <input type="text" name="model" className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Location (Factory Floor)</label>
                <input type="text" name="location" placeholder="e.g., Section A, Bay 3" className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Notes</label>
                <textarea name="notes" rows={3} className={INPUT_CLS + " resize-none"} />
              </div>
            </div>
          </CardContent>
        </Card>

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
            {loading ? "Saving..." : "Save Machine"}
          </button>
        </div>
      </form>
    </div>
  );
}
