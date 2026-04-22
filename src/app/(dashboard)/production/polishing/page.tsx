"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDateTime } from "@/lib/utils";

interface PolishingEntry {
  id: string;
  entryNumber: string;
  startTime: string;
  endTime: string | null;
  finishType: string;
  glossLevel: number | null;
  status: string;
  qualityCheck: string | null;
  slab: {
    slabNumber: string;
    block: { blockNumber: string; variety: string; color: string };
  };
  machine: { name: string; code: string };
  operator: { name: string };
}

export default function PolishingPage() {
  const [entries, setEntries] = useState<PolishingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/production/polishing")
      .then((res) => res.json())
      .then((data) => setEntries(data.entries || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    {
      header: "Entry #",
      accessor: (row: PolishingEntry) => (
        <span className="font-mono font-medium text-brand-tan-dark">{row.entryNumber}</span>
      ),
    },
    {
      header: "Slab",
      accessor: (row: PolishingEntry) => (
        <div>
          <p className="font-medium text-brand-brown">{row.slab.slabNumber}</p>
          <p className="text-xs text-brand-olive/60">{row.slab.block.variety} — {row.slab.block.color}</p>
        </div>
      ),
    },
    { header: "Machine", accessor: (row: PolishingEntry) => row.machine.name },
    { header: "Operator", accessor: (row: PolishingEntry) => row.operator.name },
    { header: "Finish", accessor: (row: PolishingEntry) => row.finishType },
    { header: "Gloss", accessor: (row: PolishingEntry) => row.glossLevel !== null ? `${row.glossLevel}%` : "—" },
    { header: "Start", accessor: (row: PolishingEntry) => formatDateTime(row.startTime) },
    {
      header: "QC",
      accessor: (row: PolishingEntry) => row.qualityCheck ? <StatusBadge status={row.qualityCheck} /> : "—",
    },
    { header: "Status", accessor: (row: PolishingEntry) => <StatusBadge status={row.status} /> },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-[28px] font-bold leading-tight text-brand-brown">Polishing</h1>
          <p className="text-sm text-brand-olive/60">Stage 3: Polish slabs to desired finish</p>
        </div>
        <Link
          href="/production/polishing/new"
          className="w-fit rounded-sm bg-brand-brown px-4 py-2 font-display text-[13px] font-bold tracking-wide text-white transition-colors hover:bg-brand-brown/90"
        >
          + New Entry
        </Link>
      </div>

      <Card>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-tan border-t-transparent" />
          </div>
        ) : (
          <DataTable columns={columns} data={entries} emptyMessage="No polishing entries yet." />
        )}
      </Card>
    </div>
  );
}
