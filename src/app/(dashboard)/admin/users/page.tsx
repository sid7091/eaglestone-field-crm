"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api-client";

const INPUT =
  "rounded-sm border border-brand-brown/20 bg-surface px-2 py-1 text-[12px] text-brand-brown focus:border-brand-tan focus:outline-none focus:ring-2 focus:ring-brand-tan/20";

const ROLES = ["ADMIN", "MANAGER", "SUPERVISOR", "OPERATOR", "VIEWER"];
const DEPARTMENTS = [
  "SALES",
  "WAREHOUSE",
  "ACCOUNTS",
  "DISPATCH",
  "PRODUCTION",
  "OPERATIONS",
  "HR",
  "ADMIN",
];

interface U {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  regionCode: string;
  reportsTo: string | null;
  isActive: boolean;
}

interface TreeNode {
  id: string;
  name: string;
  role: string;
  department: string;
  children: TreeNode[];
}

export default function OrgAdminPage() {
  const [users, setUsers] = useState<U[]>([]);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [view, setView] = useState<"table" | "tree">("table");
  const [me, setMe] = useState<{ role: string } | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const u = await api.get<{ data: U[] }>("/users?all=true");
      setUsers(u.data);
      const t = await api.get<{ data: TreeNode[] }>("/users/tree");
      setTree(t.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => d.user && setMe(d.user))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const patch = async (id: string, data: Record<string, unknown>) => {
    setError("");
    try {
      await api.patch(`/users/${id}`, data);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  };

  if (me && me.role !== "ADMIN") {
    return (
      <p className="text-[13px] text-danger">
        Only admins can manage the org hierarchy.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="font-display text-[10px] font-semibold tracking-[.2em] text-brand-olive/50">
            ADMINISTRATION
          </p>
          <h1 className="mt-1 font-display text-[28px] font-bold text-brand-brown">
            Org Hierarchy
          </h1>
        </div>
        <div className="flex gap-2">
          {(["table", "tree"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-sm px-3 py-1.5 font-display text-[12px] font-semibold ${
                view === v
                  ? "bg-brand-brown text-brand-cream"
                  : "border border-brand-brown/20 text-brand-brown"
              }`}
            >
              {v === "table" ? "Table" : "Tree"}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-sm bg-danger/5 p-3 text-[13px] text-danger">
          {error}
        </div>
      )}

      {view === "table" ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-brand-brown/10">
                  {["Name", "Role", "Dept", "Region", "Reports to", "Active"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left font-display text-[10px] font-semibold uppercase tracking-[.12em] text-brand-olive/60"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-brown/6">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 text-[13px] text-brand-brown">
                      {u.name}
                      <p className="text-[11px] text-brand-olive/50">
                        {u.email}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className={INPUT}
                        value={u.role}
                        onChange={(e) =>
                          patch(u.id, { role: e.target.value })
                        }
                      >
                        {ROLES.map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className={INPUT}
                        value={u.department}
                        onChange={(e) =>
                          patch(u.id, { department: e.target.value })
                        }
                      >
                        {DEPARTMENTS.map((d) => (
                          <option key={d}>{d}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-brand-olive">
                      {u.regionCode}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className={INPUT}
                        value={u.reportsTo ?? ""}
                        onChange={(e) =>
                          patch(u.id, {
                            reportsTo: e.target.value || null,
                          })
                        }
                      >
                        <option value="">— none —</option>
                        {users
                          .filter((o) => o.id !== u.id)
                          .map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() =>
                          patch(u.id, { isActive: !u.isActive })
                        }
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          u.isActive
                            ? "bg-success/10 text-success"
                            : "bg-danger/10 text-danger"
                        }`}
                      >
                        {u.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="p-5">
          {tree.length === 0 ? (
            <p className="text-[13px] text-brand-olive/50">
              No hierarchy defined yet. Set &quot;Reports to&quot; in the
              table view.
            </p>
          ) : (
            tree.map((n) => <TreeBranch key={n.id} node={n} depth={0} />)
          )}
        </Card>
      )}
    </div>
  );
}

function TreeBranch({ node, depth }: { node: TreeNode; depth: number }) {
  return (
    <div style={{ marginLeft: depth * 20 }}>
      <div className="mb-1 flex items-center gap-2 rounded-sm border border-brand-brown/10 px-3 py-1.5">
        <span className="text-[13px] font-medium text-brand-brown">
          {node.name}
        </span>
        <span className="text-[11px] text-brand-olive/50">
          {node.role} · {node.department}
        </span>
      </div>
      {node.children.map((c) => (
        <TreeBranch key={c.id} node={c} depth={depth + 1} />
      ))}
    </div>
  );
}
