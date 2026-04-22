"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";

interface BlockDetail {
  id: string;
  blockNumber: string;
  type: string;
  color: string;
  variety: string;
  origin: string;
  quarryName: string | null;
  supplierName: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  grade: string;
  status: string;
  arrivalDate: string;
  importBatchNo: string | null;
  landedCostINR: number | null;
  vehicleNumber: string | null;
  notes: string | null;
  slabs: Array<{
    id: string;
    slabNumber: string;
    lengthCm: number;
    widthCm: number;
    thicknessMm: number;
    grade: string;
    status: string;
    currentStage: string;
    finishType: string | null;
  }>;
  gangSawEntries: Array<{
    id: string;
    entryNumber: string;
    startTime: string;
    endTime: string | null;
    numberOfSlabs: number;
    status: string;
    operator: { name: string };
    machine: { name: string };
  }>;
}

export default function BlockDetailPage() {
  const params = useParams();
  const [block, setBlock] = useState<BlockDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/blocks/${params.id}`)
      .then((res) => res.json())
      .then((data) => setBlock(data.block))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-tan border-t-transparent" />
      </div>
    );
  }

  if (!block) {
    return <div className="text-center text-brand-olive/60">Block not found</div>;
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-[28px] font-bold leading-tight text-brand-brown">{block.blockNumber}</h1>
            <StatusBadge status={block.status} />
          </div>
          <p className="text-sm text-brand-olive/60">{block.variety} — {block.color} | {block.type}</p>
        </div>
        <Link
          href="/blocks"
          className="w-fit rounded-sm border border-brand-brown/20 px-4 py-2 text-sm font-medium text-brand-olive hover:bg-brand-brown/5"
        >
          Back to Blocks
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Block Info */}
        <Card>
          <CardHeader>
            <h2 className="font-display text-[15px] font-bold text-brand-brown">Block Information</h2>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              {[
                ["Type", block.type],
                ["Variety", block.variety],
                ["Color", block.color],
                ["Origin", block.origin],
                ["Quarry", block.quarryName || "—"],
                ["Grade", block.grade],
                ["Supplier", block.supplierName],
                ["Arrival", formatDate(block.arrivalDate)],
                ["Vehicle", block.vehicleNumber || "—"],
                ["Batch No", block.importBatchNo || "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-sm text-brand-olive/60">{label}</dt>
                  <dd className="text-sm font-medium text-brand-brown">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        {/* Dimensions & Cost */}
        <Card>
          <CardHeader>
            <h2 className="font-display text-[15px] font-bold text-brand-brown">Dimensions & Cost</h2>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-brand-olive/60">Dimensions</dt>
                <dd className="text-sm font-medium text-brand-brown">{block.lengthCm} x {block.widthCm} x {block.heightCm} cm</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-brand-olive/60">Volume</dt>
                <dd className="text-sm font-medium text-brand-brown">{((block.lengthCm * block.widthCm * block.heightCm) / 1000000).toFixed(2)} m³</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-brand-olive/60">Weight</dt>
                <dd className="text-sm font-medium text-brand-brown">{block.weightKg} kg ({(block.weightKg / 1000).toFixed(2)} tons)</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-brand-olive/60">Landed Cost</dt>
                <dd className="text-sm font-medium text-brand-brown">{block.landedCostINR ? formatCurrency(block.landedCostINR) : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-brand-olive/60">Total Slabs</dt>
                <dd className="text-sm font-bold text-brand-tan-dark">{block.slabs.length}</dd>
              </div>
            </dl>
            {block.notes && (
              <div className="mt-4 rounded-sm bg-brand-brown/5 p-3">
                <p className="font-display text-[10px] font-semibold tracking-[.12em] text-brand-olive/50 uppercase">Notes</p>
                <p className="mt-1 text-sm text-brand-olive">{block.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gang Saw History */}
        <Card>
          <CardHeader>
            <h2 className="font-display text-[15px] font-bold text-brand-brown">Gang Saw Entries</h2>
          </CardHeader>
          <CardContent className="p-0">
            {block.gangSawEntries.length === 0 ? (
              <p className="p-6 text-center text-sm text-brand-olive/60">No gang saw entries yet</p>
            ) : (
              <div className="divide-y divide-brand-brown/8">
                {block.gangSawEntries.map((entry) => (
                  <div key={entry.id} className="px-6 py-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-medium text-brand-brown">{entry.entryNumber}</span>
                      <StatusBadge status={entry.status} />
                    </div>
                    <p className="mt-1 text-xs text-brand-olive/60">{entry.numberOfSlabs} slabs | {entry.machine.name} | {entry.operator.name}</p>
                    <p className="text-xs text-brand-olive/40">{formatDateTime(entry.startTime)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Slabs Table */}
      <Card className="mt-6">
        <CardHeader>
          <h2 className="font-display text-[15px] font-bold text-brand-brown">Slabs from this Block ({block.slabs.length})</h2>
        </CardHeader>
        <CardContent className="p-0">
          {block.slabs.length === 0 ? (
            <p className="p-6 text-center text-sm text-brand-olive/60">
              No slabs produced yet. Send this block to the Gang Saw to start cutting.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-brand-brown/10">
                    {["Slab #", "Dimensions", "Thickness", "Grade", "Finish", "Stage", "Status"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-display text-[10px] font-semibold tracking-[.12em] text-brand-olive/50 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-brown/8">
                  {block.slabs.map((slab) => (
                    <tr key={slab.id} className="hover:bg-brand-brown/3">
                      <td className="px-4 py-3 font-mono text-sm font-medium text-brand-tan-dark">{slab.slabNumber}</td>
                      <td className="px-4 py-3 text-sm text-brand-brown">{slab.lengthCm} x {slab.widthCm} cm</td>
                      <td className="px-4 py-3 text-sm text-brand-brown">{slab.thicknessMm} mm</td>
                      <td className="px-4 py-3 text-sm text-brand-brown">{slab.grade}</td>
                      <td className="px-4 py-3 text-sm text-brand-brown">{slab.finishType || "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={slab.currentStage} /></td>
                      <td className="px-4 py-3"><StatusBadge status={slab.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
