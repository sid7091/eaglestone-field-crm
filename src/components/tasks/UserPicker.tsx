"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";

export interface PickUser {
  id: string;
  name: string;
  role: string;
  department: string;
  regionCode: string;
  assignable?: boolean;
}

export default function UserPicker({
  value,
  onChange,
  onlyAssignable = true,
  label = "Assignee",
}: {
  value: string;
  onChange: (id: string, user?: PickUser) => void;
  onlyAssignable?: boolean;
  label?: string;
}) {
  const [users, setUsers] = useState<PickUser[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      api
        .get<{ data: PickUser[] }>(`/users?${params.toString()}`)
        .then((r) => setUsers(r.data))
        .catch(() => setUsers([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const visible = onlyAssignable
    ? users.filter((u) => u.assignable)
    : users;

  return (
    <div className="flex flex-col gap-1">
      <label className="font-display text-[11px] font-semibold uppercase tracking-[.12em] text-brand-olive/80">
        {label}
      </label>
      <input
        type="text"
        placeholder="Search people..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full rounded-sm border border-brand-brown/20 bg-surface px-3 py-2 text-[13px] text-brand-brown focus:border-brand-tan focus:outline-none focus:ring-2 focus:ring-brand-tan/20"
      />
      <select
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value,
            visible.find((u) => u.id === e.target.value),
          )
        }
        className="mt-1 w-full cursor-pointer rounded-sm border border-brand-brown/20 bg-surface px-3 py-2 text-[13px] text-brand-brown focus:border-brand-tan focus:outline-none focus:ring-2 focus:ring-brand-tan/20"
      >
        <option value="">— select —</option>
        {visible.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} · {u.role} · {u.department} ({u.regionCode})
          </option>
        ))}
      </select>
    </div>
  );
}
