"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDateTime } from "@/lib/utils";

interface GangSawEntry {
  id: string;
  entryNumber: string;
  startTime: string;
  endTime: string | null;
  numberOfSlabs: number;
  slabThicknessMm: number;
  wastageKg: number | null;
  status: string;
  block: { blockNumber: string; variety: string; color: string };
  machine: { name: string; code: string };
  operator: { name: string };
  _count: { slabs: number };
}

export default function GangSawPage() {
  const [entries, setEntries] = useState<GangSawEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/production/gang-saw")
      .then((res) => res.json())
      .then((data) => setEntries(data.entries || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    {
      header: "Entry #",
      accessor: (row: GangSawEntry) => (
        <span className="font-medium text-blue-700">{row.entryNumber}</span>
      ),
    },
    {
      header: "Block",
      accessor: (row: GangSawEntry) => (
        <div>
          <p className="font-medium">{row.block.blockNumber}</p>
          <p className="text-xs text-stone-500">
            {row.block.variety} - {row.block.color}
          </p>
        </div>
      ),
    },
    {
      header: "Machine",
      accessor: (row: GangSawEntry) => row.machine.name,
    },
    {
      header: "Operator",
      accessor: (row: GangSawEntry) => row.operator.name,
    },
    {
      header: "Slabs",
      accessor: (row: GangSawEntry) => (
        <span className="font-semibold">{row.numberOfSlabs}</span>
      ),
    },
    {
      header: "Thickness",
      accessor: (row: GangSawEntry) => `${row.slabThicknessMm} mm`,
    },
    {
      header: "Wastage",
      accessor: (row: GangSawEntry) =>
        row.wastageKg ? `${row.wastageKg} kg` : "-",
    },
    {
      header: "Start Time",
      accessor: (row: GangSawEntry) => formatDateTime(row.startTime),
    },
    {
      header: "Status",
      accessor: (row: GangSawEntry) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">
            Gang Saw - Block Cutting
          </h1>
          <p className="text-sm text-stone-500">
            Stage 1: Cut raw blocks into slabs
          </p>
        </div>
        <Link
          href="/production/gang-saw/new"
          className="w-fit rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
        >
          + New Entry
        </Link>
      </div>

      <Card>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={entries}
            emptyMessage="No gang saw entries yet. Start by cutting a block."
          />
        )}
      </Card>
    </div>
  );
}
