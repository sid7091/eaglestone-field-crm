"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Customer {
  id: string;
  businessName: string;
  contactPerson: string | null;
  phone: string;
  email: string | null;
  customerType: string;
  tier: string;
  leadStatus: string;
  regionCode: string;
  district: string;
  city: string | null;
  annualPotentialINR: number;
  createdAt: string;
}

interface PaginatedResponse {
  data: Customer[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── Tier badge colours (custom, not in getStatusColor) ───────────────────────

const TIER_COLORS: Record<string, string> = {
  PLATINUM: "bg-violet-100 text-violet-800",
  GOLD: "bg-amber-100 text-amber-800",
  SILVER: "bg-stone-100 text-stone-700",
  BRONZE: "bg-orange-100 text-orange-800",
};

function TierBadge({ tier }: { tier: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        TIER_COLORS[tier] ?? "bg-stone-100 text-stone-700"
      }`}
    >
      {tier}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter) params.set("customerType", typeFilter);
      if (tierFilter) params.set("tier", tierFilter);
      if (statusFilter) params.set("leadStatus", statusFilter);
      params.set("page", String(page));
      params.set("limit", "20");

      const res = await api.get<PaginatedResponse>(`/customers?${params.toString()}`);
      setCustomers(res.data);
      setMeta(res.meta);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, tierFilter, statusFilter, page]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleFilterChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPage(1);
    setter(e.target.value);
  };

  const columns = [
    {
      header: "Business",
      accessor: (row: Customer) => (
        <div>
          <p className="font-medium text-stone-900">{row.businessName}</p>
          {row.contactPerson && (
            <p className="text-xs text-stone-500">{row.contactPerson}</p>
          )}
        </div>
      ),
    },
    {
      header: "Phone",
      accessor: (row: Customer) => (
        <span className="font-mono text-sm">{row.phone}</span>
      ),
    },
    {
      header: "Type",
      accessor: (row: Customer) => (
        <span className="text-xs text-stone-600">
          {row.customerType.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      header: "Tier",
      accessor: (row: Customer) => <TierBadge tier={row.tier} />,
    },
    {
      header: "Status",
      accessor: (row: Customer) => <StatusBadge status={row.leadStatus} />,
    },
    {
      header: "Region",
      accessor: (row: Customer) => (
        <div>
          <span className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
            {row.regionCode}
          </span>
          {row.city && (
            <p className="mt-0.5 text-xs text-stone-500">{row.city}</p>
          )}
        </div>
      ),
    },
    {
      header: "Annual Potential",
      accessor: (row: Customer) =>
        row.annualPotentialINR > 0 ? formatCurrency(row.annualPotentialINR) : "-",
      className: "text-right",
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Customers</h1>
          <p className="text-sm text-stone-500">
            {meta.total > 0 ? `${meta.total} customers` : "Manage your customer accounts"}
          </p>
        </div>
        <Link
          href="/customers/new"
          className="w-fit rounded-lg bg-amber-500 px-4 py-2 font-medium text-white transition-colors hover:bg-amber-600"
        >
          + Add Customer
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Search name, phone..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-stone-100 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-200"
          >
            Search
          </button>
        </form>

        <select
          value={typeFilter}
          onChange={handleFilterChange(setTypeFilter)}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
        >
          <option value="">All Types</option>
          <option value="DEALER">Dealer</option>
          <option value="ARCHITECT">Architect</option>
          <option value="BUILDER">Builder</option>
          <option value="CONTRACTOR">Contractor</option>
          <option value="DIRECT_CLIENT">Direct Client</option>
          <option value="QUARRY_OWNER">Quarry Owner</option>
        </select>

        <select
          value={tierFilter}
          onChange={handleFilterChange(setTierFilter)}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
        >
          <option value="">All Tiers</option>
          <option value="PLATINUM">Platinum</option>
          <option value="GOLD">Gold</option>
          <option value="SILVER">Silver</option>
          <option value="BRONZE">Bronze</option>
        </select>

        <select
          value={statusFilter}
          onChange={handleFilterChange(setStatusFilter)}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="NEW">New</option>
          <option value="CONTACTED">Contacted</option>
          <option value="QUALIFIED">Qualified</option>
          <option value="PROPOSAL_SENT">Proposal Sent</option>
          <option value="NEGOTIATION">Negotiation</option>
          <option value="WON">Won</option>
          <option value="LOST">Lost</option>
          <option value="DORMANT">Dormant</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Table */}
      <Card>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={customers}
            onRowClick={(row) => router.push(`/customers/${row.id}`)}
            emptyMessage="No customers found. Add your first customer to get started."
          />
        )}
      </Card>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-stone-500">
            Page {meta.page} of {meta.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page === meta.totalPages}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
