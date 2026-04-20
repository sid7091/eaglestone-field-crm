"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import Button from "@/components/ui/Button";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";

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

const INPUT_CLS =
  "rounded-sm border border-brand-brown/20 bg-surface px-3 py-2 text-[13px] text-brand-brown placeholder:text-brand-olive/35 focus:border-brand-tan focus:outline-none focus:ring-2 focus:ring-brand-tan/20 transition-colors";

export default function CustomersPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
          <p className="font-medium text-brand-brown">{row.businessName}</p>
          {row.contactPerson && (
            <p className="text-[11px] text-brand-olive/60">{row.contactPerson}</p>
          )}
        </div>
      ),
    },
    {
      header: "Phone",
      accessor: (row: Customer) => (
        <span className="font-mono text-[12px] text-brand-brown/80">{row.phone}</span>
      ),
    },
    {
      header: "Type",
      accessor: (row: Customer) => (
        <span className="text-[12px] text-brand-olive">
          {row.customerType.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      header: "Tier",
      accessor: (row: Customer) => <StatusBadge status={row.tier} variant="tier" />,
    },
    {
      header: "Status",
      accessor: (row: Customer) => <StatusBadge status={row.leadStatus} />,
    },
    {
      header: "Region",
      accessor: (row: Customer) => (
        <div>
          <span className="inline-flex items-center rounded-xs bg-brand-tan/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-brand-tan-dark">
            {row.regionCode}
          </span>
          {row.city && (
            <p className="mt-0.5 text-[11px] text-brand-olive/50">{row.city}</p>
          )}
        </div>
      ),
    },
    {
      header: "Annual Potential",
      accessor: (row: Customer) =>
        row.annualPotentialINR > 0 ? (
          <span className="font-mono text-[12px]">{formatCurrency(row.annualPotentialINR)}</span>
        ) : (
          <span className="text-brand-olive/30">—</span>
        ),
      className: "text-right",
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-[10px] font-semibold tracking-[.2em] text-brand-olive/50">
            OPERATIONS
          </p>
          <h1 className="mt-1 font-display text-[28px] font-bold leading-tight text-brand-brown">
            Customers
          </h1>
          <p className="mt-1 text-[13px] text-brand-olive/60">
            {meta.total > 0 ? `${meta.total} customers` : "Manage your customer accounts"}
          </p>
        </div>
        <Button size="sm" onClick={() => router.push("/customers/new")}>
          + ADD CUSTOMER
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Search name, phone..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={INPUT_CLS}
          />
          <Button variant="ghost" size="sm" type="submit">
            Search
          </Button>
        </form>

        <select value={typeFilter} onChange={handleFilterChange(setTypeFilter)} className={INPUT_CLS}>
          <option value="">All Types</option>
          <option value="DEALER">Dealer</option>
          <option value="ARCHITECT">Architect</option>
          <option value="BUILDER">Builder</option>
          <option value="CONTRACTOR">Contractor</option>
          <option value="DIRECT_CLIENT">Direct Client</option>
          <option value="QUARRY_OWNER">Quarry Owner</option>
        </select>

        <select value={tierFilter} onChange={handleFilterChange(setTierFilter)} className={INPUT_CLS}>
          <option value="">All Tiers</option>
          <option value="PLATINUM">Platinum</option>
          <option value="GOLD">Gold</option>
          <option value="SILVER">Silver</option>
          <option value="BRONZE">Bronze</option>
        </select>

        <select value={statusFilter} onChange={handleFilterChange(setStatusFilter)} className={INPUT_CLS}>
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

      {error && (
        <div className="mb-4 rounded-sm bg-danger/5 p-3 text-[13px] text-danger">{error}</div>
      )}

      {/* Table */}
      <Card>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-tan/30 border-t-brand-tan" />
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
          <p className="text-[12px] text-brand-olive/50">
            Page {meta.page} of {meta.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page === meta.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
