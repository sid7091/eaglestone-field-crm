"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate, formatCurrency } from "@/lib/utils";

interface Block {
  id: string;
  blockNumber: string;
  type: string;
  color: string;
  variety: string;
  origin: string;
  supplierName: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  grade: string;
  status: string;
  arrivalDate: string;
  landedCostINR: number | null;
  createdAt: string;
  _count: { slabs: number; gangSawEntries: number };
}

const INPUT_CLS = "rounded-sm border border-brand-brown/20 px-4 py-2 text-sm text-brand-brown bg-white focus:border-brand-tan focus:outline-none focus:ring-1 focus:ring-brand-tan/20";

export default function BlocksPage() {
  const router = useRouter();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const fetchBlocks = () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (search) params.set("search", search);
    fetch(`/api/blocks?${params}`)
      .then((res) => res.json())
      .then((data) => setBlocks(data.blocks || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBlocks(); }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchBlocks(); };

  const columns = [
    {
      header: "Block #",
      accessor: (row: Block) => <span className="font-mono font-medium text-brand-tan-dark">{row.blockNumber}</span>,
    },
    {
      header: "Variety",
      accessor: (row: Block) => (
        <div>
          <p className="font-medium text-brand-brown">{row.variety}</p>
          <p className="text-xs text-brand-olive/60">{row.type}</p>
        </div>
      ),
    },
    { header: "Color", accessor: "color" as keyof Block },
    { header: "Origin", accessor: "origin" as keyof Block },
    { header: "Dimensions (cm)", accessor: (row: Block) => `${row.lengthCm} x ${row.widthCm} x ${row.heightCm}` },
    { header: "Weight", accessor: (row: Block) => `${row.weightKg} kg` },
    { header: "Grade", accessor: "grade" as keyof Block },
    { header: "Slabs", accessor: (row: Block) => row._count.slabs },
    { header: "Cost", accessor: (row: Block) => row.landedCostINR ? formatCurrency(row.landedCostINR) : "—" },
    { header: "Status", accessor: (row: Block) => <StatusBadge status={row.status} /> },
    { header: "Arrival", accessor: (row: Block) => formatDate(row.arrivalDate) },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-[28px] font-bold leading-tight text-brand-brown">Raw Blocks</h1>
          <p className="text-sm text-brand-olive/60">Manage imported marble blocks</p>
        </div>
        <Link
          href="/blocks/new"
          className="w-fit rounded-sm bg-brand-brown px-4 py-2 font-display text-[13px] font-bold tracking-wide text-white transition-colors hover:bg-brand-brown/90"
        >
          + Add Block
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Search blocks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={INPUT_CLS}
          />
          <button type="submit" className="rounded-sm bg-brand-brown/8 px-4 py-2 text-sm font-medium text-brand-olive hover:bg-brand-brown/15 transition-colors">
            Search
          </button>
        </form>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={INPUT_CLS}
        >
          <option value="">All Status</option>
          <option value="RECEIVED">Received</option>
          <option value="IN_PRODUCTION">In Production</option>
          <option value="PARTIALLY_CUT">Partially Cut</option>
          <option value="FULLY_CUT">Fully Cut</option>
          <option value="EXHAUSTED">Exhausted</option>
        </select>
      </div>

      <Card>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-tan border-t-transparent" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={blocks}
            onRowClick={(row) => router.push(`/blocks/${row.id}`)}
            emptyMessage="No blocks found. Add your first block to get started."
          />
        )}
      </Card>
    </div>
  );
}
