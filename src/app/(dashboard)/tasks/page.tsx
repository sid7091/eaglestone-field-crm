"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import Button from "@/components/ui/Button";
import { api } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import { isOverdue } from "@/lib/tasks";
import Modal from "@/components/tasks/Modal";
import UserPicker from "@/components/tasks/UserPicker";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  deadline: string;
  decomposition: string;
  assignedTo?: { id: string; name: string; role: string } | null;
  assignedBy?: { id: string; name: string; role: string } | null;
  templateId: string | null;
}

interface Me {
  userId: string;
  role: string;
}

const INPUT =
  "rounded-sm border border-brand-brown/20 bg-surface px-3 py-2 text-[13px] text-brand-brown focus:border-brand-tan focus:outline-none focus:ring-2 focus:ring-brand-tan/20";

export default function TasksPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [tab, setTab] = useState<"mine" | "created" | "all">("mine");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [tmplOpen, setTmplOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => d.user && setMe(d.user))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const p = new URLSearchParams();
      if (tab === "mine") p.set("mine", "true");
      if (tab === "created" && me) p.set("assignedById", me.userId);
      if (statusFilter) p.set("status", statusFilter);
      if (priorityFilter) p.set("priority", priorityFilter);
      const r = await api.get<{ data: Task[] }>(`/tasks?${p.toString()}`);
      setTasks(r.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [tab, statusFilter, priorityFilter, me]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const canCreate =
    me && ["ADMIN", "MANAGER", "SUPERVISOR"].includes(me.role);

  const columns = [
    {
      header: "Task",
      accessor: (t: Task) => (
        <div>
          <p className="font-medium text-brand-brown">{t.title}</p>
          {t.templateId && (
            <span className="text-[10px] text-brand-tan-dark">
              from template
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Assignee",
      accessor: (t: Task) => (
        <span className="text-[12px] text-brand-olive">
          {t.assignedTo?.name ?? "—"}
        </span>
      ),
    },
    {
      header: "By",
      accessor: (t: Task) => (
        <span className="text-[12px] text-brand-olive/70">
          {t.assignedBy?.name ?? "—"}
        </span>
      ),
    },
    {
      header: "Deadline",
      accessor: (t: Task) => (
        <span
          className={
            isOverdue(t.status, t.deadline)
              ? "font-semibold text-danger"
              : "text-[12px] text-brand-brown/80"
          }
        >
          {isOverdue(t.status, t.deadline) ? "OVERDUE · " : ""}
          {formatDateTime(t.deadline)}
        </span>
      ),
    },
    {
      header: "Priority",
      accessor: (t: Task) => (
        <span className="text-[12px] text-brand-olive">{t.priority}</span>
      ),
    },
    {
      header: "Status",
      accessor: (t: Task) => <StatusBadge status={t.status} />,
    },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-[10px] font-semibold tracking-[.2em] text-brand-olive/50">
            COORDINATION
          </p>
          <h1 className="mt-1 font-display text-[28px] font-bold leading-tight text-brand-brown">
            Tasks
          </h1>
          <p className="mt-1 text-[13px] text-brand-olive/60">
            Assign, delegate and track work across your team
          </p>
        </div>
        {canCreate && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTmplOpen(true)}
            >
              Start from template
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              + NEW TASK
            </Button>
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["mine", "created", "all"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-sm px-3 py-1.5 font-display text-[12px] font-semibold ${
              tab === t
                ? "bg-brand-brown text-brand-cream"
                : "border border-brand-brown/20 text-brand-brown hover:bg-brand-brown/5"
            }`}
          >
            {t === "mine"
              ? "Assigned to me"
              : t === "created"
                ? "Created by me"
                : "All"}
          </button>
        ))}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={INPUT}
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="FORWARDED">Forwarded</option>
          <option value="BLOCKED_BY_SUBTASKS">Blocked by subtasks</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className={INPUT}
        >
          <option value="">All priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-sm bg-danger/5 p-3 text-[13px] text-danger">
          {error}
        </div>
      )}

      <Card>
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-tan/30 border-t-brand-tan" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={tasks}
            onRowClick={(r) => router.push(`/tasks/${r.id}`)}
            flagged={(r) => isOverdue(r.status, r.deadline)}
            emptyMessage="No tasks here yet."
          />
        )}
      </Card>

      <CreateTaskModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          load();
        }}
      />
      <TemplateModal
        open={tmplOpen}
        onClose={() => setTmplOpen(false)}
        onDone={(rootId) => {
          setTmplOpen(false);
          if (rootId) router.push(`/tasks/${rootId}`);
        }}
      />
    </div>
  );
}

function CreateTaskModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setBusy(true);
    setErr("");
    try {
      await api.post("/tasks", {
        title,
        description,
        assignedToId,
        deadline: new Date(deadline).toISOString(),
        priority,
      });
      setTitle("");
      setDescription("");
      setAssignedToId("");
      setDeadline("");
      onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New task">
      <div className="flex flex-col gap-3">
        <input
          className={INPUT}
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className={INPUT}
          placeholder="Description (optional)"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <UserPicker value={assignedToId} onChange={setAssignedToId} />
        <label className="font-display text-[11px] font-semibold uppercase tracking-[.12em] text-brand-olive/80">
          Deadline
        </label>
        <input
          type="datetime-local"
          className={INPUT}
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
        <select
          className={INPUT}
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
        {err && <p className="text-[12px] text-danger">{err}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            loading={busy}
            disabled={!title || !assignedToId || !deadline}
            onClick={submit}
          >
            Create
          </Button>
        </div>
      </div>
    </Modal>
  );
}

interface Tmpl {
  id: string;
  name: string;
  description: string | null;
  steps: { id: string; title: string }[];
}

function TemplateModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: (rootId?: string) => void;
}) {
  const [templates, setTemplates] = useState<Tmpl[]>([]);
  const [selected, setSelected] = useState("");
  const [preview, setPreview] = useState<
    { title: string; resolvedUserName: string | null; reason?: string }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    api
      .get<{ data: Tmpl[] }>("/task-templates")
      .then((r) => setTemplates(r.data))
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!selected) {
      setPreview([]);
      return;
    }
    api
      .post<{
        data: {
          title: string;
          resolvedUserName: string | null;
          reason?: string;
        }[];
      }>(`/task-templates/${selected}/preview`, {})
      .then((r) => setPreview(r.data))
      .catch(() => setPreview([]));
  }, [selected]);

  const instantiate = async () => {
    setBusy(true);
    setErr("");
    try {
      const root = await api.post<{ id: string }>(
        `/tasks/from-template/${selected}`,
        {},
      );
      onDone(root.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to instantiate");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Start from template" wide>
      <div className="flex flex-col gap-3">
        <select
          className={INPUT}
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">— choose a template —</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.steps.length} steps)
            </option>
          ))}
        </select>
        {preview.length > 0 && (
          <div className="rounded-sm border border-brand-brown/10 p-3">
            <p className="mb-2 font-display text-[11px] font-semibold uppercase tracking-[.12em] text-brand-olive/70">
              Resolved assignees
            </p>
            <ul className="space-y-1">
              {preview.map((p, i) => (
                <li key={i} className="text-[12px]">
                  <span className="font-medium text-brand-brown">
                    {p.title}
                  </span>{" "}
                  →{" "}
                  {p.resolvedUserName ? (
                    <span className="text-brand-olive">
                      {p.resolvedUserName}
                    </span>
                  ) : (
                    <span className="text-danger">
                      Unresolved ({p.reason})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {err && <p className="text-[12px] text-danger">{err}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            loading={busy}
            disabled={!selected}
            onClick={instantiate}
          >
            Instantiate
          </Button>
        </div>
      </div>
    </Modal>
  );
}
