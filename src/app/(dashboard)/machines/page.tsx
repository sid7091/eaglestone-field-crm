"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
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
  GANG_SAW: "bg-blue-50 border-blue-200",
  EPOXY_LINE: "bg-purple-50 border-purple-200",
  POLISHING_MACHINE: "bg-indigo-50 border-indigo-200",
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  const groupedMachines = machines.reduce(
    (acc, machine) => {
      if (!acc[machine.type]) acc[machine.type] = [];
      acc[machine.type].push(machine);
      return acc;
    },
    {} as Record<string, Machine[]>
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Machines</h1>
          <p className="text-sm text-gray-500">
            Manage factory machines and equipment
          </p>
        </div>
        <Link
          href="/machines/new"
          className="rounded-lg bg-amber-500 px-4 py-2 font-medium text-white transition-colors hover:bg-amber-600"
        >
          + Add Machine
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Machines</p>
          <p className="text-2xl font-bold text-gray-900">{machines.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-2xl font-bold text-green-600">
            {machines.filter((m) => m.status === "ACTIVE").length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Under Maintenance</p>
          <p className="text-2xl font-bold text-yellow-600">
            {machines.filter((m) => m.status === "MAINTENANCE").length}
          </p>
        </div>
      </div>

      {/* Machines by Type */}
      {Object.entries(groupedMachines).length === 0 ? (
        <Card>
          <CardContent>
            <p className="py-8 text-center text-gray-500">
              No machines registered yet. Add your first machine to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedMachines).map(([type, typeMachines]) => (
            <div key={type}>
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                {machineTypeLabels[type] || type}
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {typeMachines.map((machine) => (
                  <Card
                    key={machine.id}
                    className={machineTypeColors[type] || ""}
                  >
                    <CardContent>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {machine.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Code: {machine.code}
                          </p>
                        </div>
                        <StatusBadge status={machine.status} />
                      </div>
                      <div className="mt-4 space-y-2 text-sm">
                        {machine.manufacturer && (
                          <p className="text-gray-600">
                            <span className="font-medium">Make:</span>{" "}
                            {machine.manufacturer}
                            {machine.model ? ` - ${machine.model}` : ""}
                          </p>
                        )}
                        {machine.location && (
                          <p className="text-gray-600">
                            <span className="font-medium">Location:</span>{" "}
                            {machine.location}
                          </p>
                        )}
                        {machine.lastMaintenance && (
                          <p className="text-gray-600">
                            <span className="font-medium">Last Maintenance:</span>{" "}
                            {formatDate(machine.lastMaintenance)}
                          </p>
                        )}
                        {machine.nextMaintenance && (
                          <p className="text-gray-600">
                            <span className="font-medium">Next Maintenance:</span>{" "}
                            {formatDate(machine.nextMaintenance)}
                          </p>
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
