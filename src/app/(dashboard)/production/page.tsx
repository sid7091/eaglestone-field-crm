"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";

const productionStages = [
  {
    name: "Gang Saw",
    description: "Cut raw blocks into slabs using gang saw machines",
    href: "/production/gang-saw",
    icon: "M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z",
    color: "bg-blue-50 text-blue-600",
    stage: "Stage 1",
  },
  {
    name: "Epoxy / Vacuum",
    description:
      "Strengthen slabs with epoxy infusion and vacuum sealing to prevent micro-fissures",
    href: "/production/epoxy",
    icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
    color: "bg-purple-50 text-purple-600",
    stage: "Stage 2",
  },
  {
    name: "Polishing",
    description:
      "Polish slabs to achieve desired finish — polished, honed, leather, brushed, or flamed",
    href: "/production/polishing",
    icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
    color: "bg-indigo-50 text-indigo-600",
    stage: "Stage 3",
  },
];

export default function ProductionPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Production</h1>
        <p className="text-sm text-gray-500">
          Manage production stages — Block to finished slab
        </p>
      </div>

      {/* Production Flow Diagram */}
      <Card className="mb-8">
        <CardContent>
          <div className="flex flex-wrap items-center justify-center gap-y-4 sm:flex-nowrap sm:justify-between">
            {["Raw Block", "Gang Saw", "Epoxy/Vacuum", "Polishing", "Warehouse"].map(
              (stage, i) => (
                <div key={stage} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full sm:h-12 sm:w-12 ${
                        i === 0
                          ? "bg-amber-100 text-amber-700"
                          : i === 4
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                      } text-sm font-bold sm:text-base`}
                    >
                      {i + 1}
                    </div>
                    <p className="mt-1 text-[10px] font-medium text-gray-600 sm:mt-2 sm:text-xs">{stage}</p>
                  </div>
                  {i < 4 && (
                    <div className="mx-2 h-0.5 w-6 bg-gray-300 sm:mx-4 sm:w-16 lg:w-24" />
                  )}
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stage Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {productionStages.map((stage) => (
          <Link key={stage.name} href={stage.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent>
                <div className="flex items-start gap-4">
                  <div className={`rounded-xl p-3 ${stage.color}`}>
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d={stage.icon}
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400">
                      {stage.stage}
                    </p>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {stage.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {stage.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
