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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (!block) {
    return <div className="text-center text-gray-500">Block not found</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {block.blockNumber}
            </h1>
            <StatusBadge status={block.status} />
          </div>
          <p className="text-sm text-gray-500">
            {block.variety} - {block.color} | {block.type}
          </p>
        </div>
        <Link
          href="/blocks"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to Blocks
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Block Info */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Block Information</h2>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              {[
                ["Type", block.type],
                ["Variety", block.variety],
                ["Color", block.color],
                ["Origin", block.origin],
                ["Quarry", block.quarryName || "-"],
                ["Grade", block.grade],
                ["Supplier", block.supplierName],
                ["Arrival", formatDate(block.arrivalDate)],
                ["Vehicle", block.vehicleNumber || "-"],
                ["Batch No", block.importBatchNo || "-"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-sm text-gray-500">{label}</dt>
                  <dd className="text-sm font-medium text-gray-900">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        {/* Dimensions */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Dimensions & Cost</h2>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Dimensions</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {block.lengthCm} x {block.widthCm} x {block.heightCm} cm
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Volume</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {((block.lengthCm * block.widthCm * block.heightCm) / 1000000).toFixed(2)} m³
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Weight</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {block.weightKg} kg ({(block.weightKg / 1000).toFixed(2)} tons)
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Landed Cost</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {block.landedCostINR ? formatCurrency(block.landedCostINR) : "-"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Total Slabs</dt>
                <dd className="text-sm font-bold text-amber-600">
                  {block.slabs.length}
                </dd>
              </div>
            </dl>
            {block.notes && (
              <div className="mt-4 rounded-lg bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-500">Notes</p>
                <p className="mt-1 text-sm text-gray-700">{block.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gang Saw History */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Gang Saw Entries</h2>
          </CardHeader>
          <CardContent className="p-0">
            {block.gangSawEntries.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-500">
                No gang saw entries yet
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {block.gangSawEntries.map((entry) => (
                  <div key={entry.id} className="px-6 py-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">
                        {entry.entryNumber}
                      </span>
                      <StatusBadge status={entry.status} />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {entry.numberOfSlabs} slabs | {entry.machine.name} | {entry.operator.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDateTime(entry.startTime)}
                    </p>
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
          <h2 className="font-semibold text-gray-900">
            Slabs from this Block ({block.slabs.length})
          </h2>
        </CardHeader>
        <CardContent className="p-0">
          {block.slabs.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-500">
              No slabs produced yet. Send this block to the Gang Saw to start cutting.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Slab #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Dimensions</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Thickness</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Grade</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Finish</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Stage</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {block.slabs.map((slab) => (
                    <tr key={slab.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-amber-700">
                        {slab.slabNumber}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {slab.lengthCm} x {slab.widthCm} cm
                      </td>
                      <td className="px-4 py-3 text-sm">{slab.thicknessMm} mm</td>
                      <td className="px-4 py-3 text-sm">{slab.grade}</td>
                      <td className="px-4 py-3 text-sm">{slab.finishType || "-"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={slab.currentStage} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={slab.status} />
                      </td>
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
