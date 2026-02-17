"use client";

import { useEffect, useState } from "react";
import StatCard from "@/components/ui/StatCard";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";

interface DashboardData {
  stats: {
    totalBlocks: number;
    blocksInProduction: number;
    totalSlabs: number;
    slabsByStage: Record<string, number>;
    totalInventory: number;
    inventoryInStock: number;
    activeProduction: {
      gangSaw: number;
      epoxy: number;
      polishing: number;
    };
    activeMachines: number;
  };
  recentBlocks: Array<{
    blockNumber: string;
    variety: string;
    color: string;
    status: string;
    createdAt: string;
  }>;
  recentSlabs: Array<{
    slabNumber: string;
    currentStage: string;
    status: string;
    updatedAt: string;
    block: { variety: string };
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (!data?.stats) {
    return <div className="text-center text-gray-500">Failed to load dashboard data</div>;
  }

  const { stats, recentBlocks, recentSlabs } = data;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Eagle Stone ERP - Production Overview</p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Blocks"
          value={stats.totalBlocks}
          subtitle={`${stats.blocksInProduction} in production`}
          color="amber"
        />
        <StatCard
          title="Total Slabs"
          value={stats.totalSlabs}
          subtitle={`${stats.inventoryInStock} in stock`}
          color="blue"
        />
        <StatCard
          title="Active Production"
          value={
            stats.activeProduction.gangSaw +
            stats.activeProduction.epoxy +
            stats.activeProduction.polishing
          }
          subtitle={`GS: ${stats.activeProduction.gangSaw} | EP: ${stats.activeProduction.epoxy} | PL: ${stats.activeProduction.polishing}`}
          color="green"
        />
        <StatCard
          title="Active Machines"
          value={stats.activeMachines}
          subtitle="Currently operational"
          color="purple"
        />
      </div>

      {/* Production Pipeline */}
      <Card className="mb-8">
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Production Pipeline</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            {["GANG_SAW", "EPOXY", "POLISHING", "QC", "WAREHOUSE"].map((stage) => (
              <div key={stage} className="rounded-lg bg-gray-50 p-4 text-center">
                <p className="text-sm font-medium text-gray-500">
                  {stage.replace(/_/g, " ")}
                </p>
                <p className="mt-1 text-3xl font-bold text-gray-900">
                  {stats.slabsByStage[stage] || 0}
                </p>
                <p className="text-xs text-gray-400">slabs</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Recent Blocks</h2>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {recentBlocks.length === 0 ? (
                <p className="p-6 text-center text-sm text-gray-500">No blocks yet</p>
              ) : (
                recentBlocks.map((block) => (
                  <div
                    key={block.blockNumber}
                    className="flex items-center justify-between px-6 py-3"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{block.blockNumber}</p>
                      <p className="text-sm text-gray-500">
                        {block.variety} - {block.color}
                      </p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={block.status} />
                      <p className="mt-1 text-xs text-gray-400">
                        {formatDate(block.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Recent Slab Activity</h2>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {recentSlabs.length === 0 ? (
                <p className="p-6 text-center text-sm text-gray-500">No slabs yet</p>
              ) : (
                recentSlabs.map((slab) => (
                  <div
                    key={slab.slabNumber}
                    className="flex items-center justify-between px-6 py-3"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{slab.slabNumber}</p>
                      <p className="text-sm text-gray-500">{slab.block.variety}</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={slab.currentStage} />
                      <p className="mt-1 text-xs text-gray-400">
                        {formatDate(slab.updatedAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
