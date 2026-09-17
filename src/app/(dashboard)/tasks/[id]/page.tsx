"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { api } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import { isOverdue } from "@/lib/tasks";
import Modal from "@/components/tasks/Modal";
import UserPicker from "@/components/tasks/UserPicker";
import TaskChainTimeline, {
  ChainNode,
} from "@/components/tasks/TaskChainTimeline";

const INPUT =
  "w-full rounded-sm border border-brand-brown/20 bg-surface px-3 py-2 text-[13px] text-brand-brown focus:border-brand-tan focus:outline-none focus:ring-2 focus:ring-brand-tan/20";

interface TaskDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  decomposition: string;
  deadline: string;
  assignedToId: string;
  assignedById: string;
  rootTaskId: string | null;
  assignedTo?: { id: string; name: string; role: string } | null;
  assignedBy?: { id: string; name: string; role: string } | null;
}

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [me, setMe] = useState<{ userId: string; role: string } | null>(null);
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [chain, setChain] = useState<ChainNode[]>([]);
  const [error, setError] = useState("");
  const [fwdOpen, setFwdOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => d.user && setMe(d.user))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      const t = await api.get<TaskDetail>(`/tasks/${id}`);
      setTask(t);
      const c = await api.get<{ data: ChainNode[] }>(`/tasks/${id}/chain`);
      setChain(c.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const act = async (fn: () => Promise<unknown>) => {
    setError("");
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    }
  };

  if (error && !task)
    return <p className="text-[13px] text-danger">{error}</p>;
  if (!task)
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-tan/30 border-t-brand-tan" />
      </div>
    );

  const mine = me?.userId === task.assignedToId;
  const isAdmin = me?.role === "ADMIN";
  const leaf = task.decomposition === "NONE";
  const open = task.status !== "COMPLETED" && task.status !== "CANCELLED";
  const isRootOwner = me?.userId === task.assignedById;

  return (
    <div>
      <button
        onClick={() => router.push("/tasks")}
        className="mb-4 text-[12px] text-brand-olive/60 hover:text-brand-brown"
      >
        ← Back to tasks
      </button>

      {error && (
        <div className="mb-4 rounded-sm bg-danger/5 p-3 text-[13px] text-danger">
          {error}
        </div>
      )}

      <Card className="mb-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-[22px] font-bold text-brand-brown">
              {task.title}
            </h1>
            <p className="mt-1 text-[13px] text-brand-olive/70">
              {task.description || "No description"}
            </p>
          </div>
          <StatusBadge status={task.status} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-[12px] sm:grid-cols-4">
          <Meta label="Priority" value={task.priority} />
          <Meta
            label="Deadline"
            value={formatDateTime(task.deadline)}
            danger={isOverdue(task.status, task.deadline)}
          />
          <Meta label="Assignee" value={task.assignedTo?.name ?? "—"} />
          <Meta label="Assigned by" value={task.assignedBy?.name ?? "—"} />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {mine && leaf && open && task.status === "PENDING" && (
            <Button
              size="sm"
              onClick={() =>
                act(() => api.patch(`/tasks/${id}`, { status: "IN_PROGRESS" }))
              }
            >
              Mark in progress
            </Button>
          )}
          {mine && leaf && open && (
            <>
              <Button
                size="sm"
                variant="success"
                onClick={() => act(() => api.post(`/tasks/${id}/complete`, {}))}
              >
                Mark complete
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setFwdOpen(true)}
              >
                Forward to…
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSplitOpen(true)}
              >
                Split into subtasks…
              </Button>
            </>
          )}
          {(isAdmin || isRootOwner) && open && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => act(() => api.post(`/tasks/${id}/cancel`, {}))}
            >
              Cancel chain
            </Button>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <p className="mb-3 font-display text-[11px] font-semibold uppercase tracking-[.12em] text-brand-olive/70">
          Assignment chain
        </p>
        <TaskChainTimeline nodes={chain} currentId={id} />
      </Card>

      <ForwardModal
        open={fwdOpen}
        onClose={() => setFwdOpen(false)}
        taskId={id}
        deadline={task.deadline}
        onDone={() => {
          setFwdOpen(false);
          load();
        }}
      />
      <SplitModal
        open={splitOpen}
        onClose={() => setSplitOpen(false)}
        taskId={id}
        parentDeadline={task.deadline}
        onDone={() => {
          setSplitOpen(false);
          load();
        }}
      />
    </div>
  );
}

function Meta({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div>
      <p className="font-display text-[10px] font-semibold uppercase tracking-[.12em] text-brand-olive/50">
        {label}
      </p>
      <p
        className={`mt-0.5 ${danger ? "font-semibold text-danger" : "text-brand-brown"}`}
      >
        {value}
      </p>
    </div>
  );
}

function ForwardModal({
  open,
  onClose,
  taskId,
  deadline,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  taskId: string;
  deadline: string;
  onDone: () => void;
}) {
  const [assignedToId, setAssignedToId] = useState("");
  const [note, setNote] = useState("");
  const [dl, setDl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setBusy(true);
    setErr("");
    try {
      await api.post(`/tasks/${taskId}/forward`, {
        assignedToId,
        note,
        deadline: dl ? new Date(dl).toISOString() : undefined,
      });
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Forward task">
      <div className="flex flex-col gap-3">
        <UserPicker value={assignedToId} onChange={setAssignedToId} />
        <label className="font-display text-[11px] font-semibold uppercase tracking-[.12em] text-brand-olive/80">
          New deadline (≤ {formatDateTime(deadline)})
        </label>
        <input
          type="datetime-local"
          className={INPUT}
          value={dl}
          onChange={(e) => setDl(e.target.value)}
        />
        <textarea
          className={INPUT}
          rows={2}
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {err && <p className="text-[12px] text-danger">{err}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            loading={busy}
            disabled={!assignedToId}
            onClick={submit}
          >
            Forward
          </Button>
        </div>
      </div>
    </Modal>
  );
}

interface SubRow {
  title: string;
  assignedToId: string;
  deadline: string;
  priority: string;
}

function SplitModal({
  open,
  onClose,
  taskId,
  parentDeadline,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  taskId: string;
  parentDeadline: string;
  onDone: () => void;
}) {
  const empty: SubRow = {
    title: "",
    assignedToId: "",
    deadline: "",
    priority: "MEDIUM",
  };
  const [rows, setRows] = useState<SubRow[]>([
    { ...empty },
    { ...empty },
  ]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const setRow = (i: number, patch: Partial<SubRow>) =>
    setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const submit = async () => {
    setBusy(true);
    setErr("");
    try {
      await api.post(`/tasks/${taskId}/split`, {
        subtasks: rows.map((r) => ({
          ...r,
          deadline: new Date(r.deadline).toISOString(),
        })),
      });
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const valid = rows.every((r) => r.title && r.assignedToId && r.deadline);

  return (
    <Modal open={open} onClose={onClose} title="Split into subtasks" wide>
      <p className="mb-3 text-[12px] text-brand-olive/60">
        Each subtask must be due on or before {formatDateTime(parentDeadline)}.
        The parent completes automatically once every subtask is done.
      </p>
      <div className="flex flex-col gap-4">
        {rows.map((r, i) => (
          <div
            key={i}
            className="rounded-sm border border-brand-brown/10 p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-display text-[11px] font-semibold uppercase tracking-[.12em] text-brand-olive/70">
                Subtask {i + 1}
              </span>
              {rows.length > 2 && (
                <button
                  className="text-[12px] text-danger"
                  onClick={() =>
                    setRows((x) => x.filter((_, j) => j !== i))
                  }
                >
                  Remove
                </button>
              )}
            </div>
            <input
              className={`${INPUT} mb-2`}
              placeholder="Title"
              value={r.title}
              onChange={(e) => setRow(i, { title: e.target.value })}
            />
            <UserPicker
              value={r.assignedToId}
              onChange={(v) => setRow(i, { assignedToId: v })}
            />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                type="datetime-local"
                className={INPUT}
                value={r.deadline}
                onChange={(e) => setRow(i, { deadline: e.target.value })}
              />
              <select
                className={INPUT}
                value={r.priority}
                onChange={(e) => setRow(i, { priority: e.target.value })}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>
        ))}
        <button
          className="text-[12px] font-semibold text-brand-tan-dark"
          onClick={() => setRows((r) => [...r, { ...empty }])}
        >
          + Add another subtask
        </button>
        {err && <p className="text-[12px] text-danger">{err}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            loading={busy}
            disabled={!valid}
            onClick={submit}
          >
            Create subtasks
          </Button>
        </div>
      </div>
    </Modal>
  );
}
