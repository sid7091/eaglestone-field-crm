"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";

interface Machine {
  id: string;
  name: string;
  code: string;
  type: string;
  manufacturer: string | null;
  model: string | null;
  location: string | null;
  status: string;
  lastMaintenance: string | null;
  nextMaintenance: string | null;
  notes: string | null;
}

const machineTypeLabels: Record<string, string> = {
  GANG_SAW: "Gang Saw",
  EPOXY_LINE: "Epoxy / Vacuum Line",
  POLISHING_MACHINE: "Polishing Machine",
};

const machineTypeColors: Record<string, string> = {
  GANG_SAW: "border-brand-brown/20 bg-brand-brown/5",
  EPOXY_LINE: "border-brand-tan/30 bg-brand-tan/8",
  POLISHING_MACHINE: "border-success/20 bg-success/8",
};

export default function MachinesPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/machines")
      .then((res) => res.json())
      .then((data) => setMachines(data.machines || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-tan border-t-transparent" />
      </div>
    );
  }

  const groupedMachines = machines.reduce((acc, machine) => {
    if (!acc[machine.type]) acc[machine.type] = [];
    acc[machine.type].push(machine);
    return acc;
  }, {} as Record<string, Machine[]>);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-[28px] font-bold leading-tight text-brand-brown">Machines</h1>
          <p className="text-sm text-brand-olive/60">Manage factory machines and equipment</p>
        </div>
        <Link
          href="/machines/new"
          className="w-fit rounded-sm bg-brand-brown px-4 py-2 font-display text-[13px] font-bold tracking-wide text-white transition-colors hover:bg-brand-brown/90"
        >
          + Add Machine
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Total Machines", value: machines.length, cls: "text-brand-brown" },
          { label: "Active", value: machines.filter((m) => m.status === "ACTIVE").length, cls: "text-success" },
          { label: "Under Maintenance", value: machines.filter((m) => m.status === "MAINTENANCE").length, cls: "text-warning" },
        ].map(({ label, value, cls }) => (
          <div key={label} className="rounded-sm border border-brand-brown/10 bg-surface p-4 shadow-1">
            <p className="text-sm text-brand-olive/60">{label}</p>
            <p className={`text-2xl font-bold ${cls}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Machines by Type */}
      {Object.entries(groupedMachines).length === 0 ? (
        <Card>
          <CardContent>
            <p className="py-8 text-center text-brand-olive/60">
              No machines registered yet. Add your first machine to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedMachines).map(([type, typeMachines]) => (
            <div key={type}>
              <h2 className="mb-3 font-display text-[15px] font-bold text-brand-brown">
                {machineTypeLabels[type] || type}
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {typeMachines.map((machine) => (
                  <Card key={machine.id} className={machineTypeColors[type] || ""}>
                    <CardContent>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-display text-[16px] font-bold text-brand-brown">{machine.name}</h3>
                          <p className="font-mono text-xs text-brand-olive/60">Code: {machine.code}</p>
                        </div>
                        <StatusBadge status={machine.status} />
                      </div>
                      <div className="mt-4 space-y-2 text-sm text-brand-olive/80">
                        {machine.manufacturer && (
                          <p><span className="font-medium text-brand-olive">Make:</span> {machine.manufacturer}{machine.model ? ` — ${machine.model}` : ""}</p>
                        )}
                        {machine.location && (
                          <p><span className="font-medium text-brand-olive">Location:</span> {machine.location}</p>
                        )}
                        {machine.lastMaintenance && (
                          <p><span className="font-medium text-brand-olive">Last Service:</span> {formatDate(machine.lastMaintenance)}</p>
                        )}
                        {machine.nextMaintenance && (
                          <p><span className="font-medium text-brand-olive">Next Service:</span> {formatDate(machine.nextMaintenance)}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
