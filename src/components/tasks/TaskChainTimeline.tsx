"use client";

import StatusBadge from "@/components/ui/StatusBadge";
import { formatDateTime } from "@/lib/utils";

export interface ChainNode {
  id: string;
  title: string;
  status: string;
  decomposition: string;
  parentTaskId: string | null;
  deadline: string;
  assignedTo?: { name: string; role: string; department: string } | null;
}

function buildTree(nodes: ChainNode[]) {
  const byParent = new Map<string | null, ChainNode[]>();
  for (const n of nodes) {
    const key = n.parentTaskId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(n);
  }
  const ids = new Set(nodes.map((n) => n.id));
  const roots = nodes.filter(
    (n) => !n.parentTaskId || !ids.has(n.parentTaskId),
  );
  return { byParent, roots };
}

function Node({
  node,
  byParent,
  currentId,
  depth,
}: {
  node: ChainNode;
  byParent: Map<string | null, ChainNode[]>;
  currentId: string;
  depth: number;
}) {
  const kids = byParent.get(node.id) ?? [];
  return (
    <div style={{ marginLeft: depth * 18 }} className="relative">
      <div
        className={`mb-2 rounded-sm border px-3 py-2 ${
          node.id === currentId
            ? "border-brand-tan bg-brand-tan/5"
            : "border-brand-brown/10 bg-surface"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-medium text-brand-brown">
            {node.title}
          </p>
          <StatusBadge status={node.status} />
        </div>
        <p className="mt-0.5 text-[11px] text-brand-olive/60">
          {node.assignedTo
            ? `${node.assignedTo.name} · ${node.assignedTo.role} · ${node.assignedTo.department}`
            : "Unassigned"}{" "}
          · due {formatDateTime(node.deadline)}
        </p>
      </div>
      {kids.map((k) => (
        <Node
          key={k.id}
          node={k}
          byParent={byParent}
          currentId={currentId}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

export default function TaskChainTimeline({
  nodes,
  currentId,
}: {
  nodes: ChainNode[];
  currentId: string;
}) {
  if (nodes.length === 0)
    return (
      <p className="text-[13px] text-brand-olive/50">No visible chain.</p>
    );
  const { byParent, roots } = buildTree(nodes);
  return (
    <div>
      {roots.map((r) => (
        <Node
          key={r.id}
          node={r}
          byParent={byParent}
          currentId={currentId}
          depth={0}
        />
      ))}
    </div>
  );
}
