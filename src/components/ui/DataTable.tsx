"use client";

import { cn } from "@/lib/utils";

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  flagged?: (row: T) => boolean;
}

export default function DataTable<T extends { id: string }>({
  columns,
  data,
  onRowClick,
  emptyMessage = "No data found",
  flagged,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-brand-brown/10">
            {columns.map((col, i) => (
              <th
                key={i}
                className="px-4 py-3 text-left font-display text-[10px] font-semibold tracking-[.12em] text-brand-olive/60 uppercase"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-brown/6">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-[13px] text-brand-olive/50"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => {
              const isFlag = flagged?.(row) ?? false;
              return (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "transition-colors",
                    isFlag
                      ? "bg-danger/5 hover:bg-danger/8"
                      : "hover:bg-brand-brown/3",
                    onRowClick ? "cursor-pointer" : ""
                  )}
                >
                  {columns.map((col, i) => (
                    <td
                      key={i}
                      className={cn(
                        "px-4 py-3 text-[13px] text-brand-brown",
                        col.className
                      )}
                    >
                      {typeof col.accessor === "function"
                        ? col.accessor(row)
                        : (row[col.accessor] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
