"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { api } from "@/lib/api-client";

const INPUT =
  "w-full rounded-sm border border-brand-brown/20 bg-surface px-3 py-2 text-[13px] text-brand-brown focus:border-brand-tan focus:outline-none focus:ring-2 focus:ring-brand-tan/20";

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
const ROLES = ["ADMIN", "MANAGER", "SUPERVISOR", "OPERATOR", "VIEWER"];

interface Step {
  title: string;
  description: string;
  assigneeDepartment: string;
  assigneeRole: string;
  priority: string;
  deadlineOffsetHours: number;
}

export default function TemplateEditor({
  templateId,
}: {
  templateId?: string;
}) {
  const router = useRouter();
  const isNew = !templateId;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultPriority, setDefaultPriority] = useState("MEDIUM");
  const [defaultDeadlineHours, setDefaultDeadlineHours] = useState(72);
  const [steps, setSteps] = useState<Step[]>([
    {
      title: "",
      description: "",
      assigneeDepartment: "",
      assigneeRole: "",
      priority: "MEDIUM",
      deadlineOffsetHours: 0,
    },
  ]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!templateId) return;
    api
      .get<{
        name: string;
        description: string | null;
        defaultPriority: string;
        defaultDeadlineHours: number;
        steps: Step[];
      }>(`/task-templates/${templateId}`)
      .then((t) => {
        setName(t.name);
        setDescription(t.description ?? "");
        setDefaultPriority(t.defaultPriority);
        setDefaultDeadlineHours(t.defaultDeadlineHours);
        setSteps(
          t.steps.map((s) => ({
            title: s.title,
            description: s.description ?? "",
            assigneeDepartment: s.assigneeDepartment ?? "",
            assigneeRole: s.assigneeRole ?? "",
            priority: s.priority,
            deadlineOffsetHours: s.deadlineOffsetHours,
          })),
        );
      })
      .catch(() => {});
  }, [templateId]);

  const setStep = (i: number, patch: Partial<Step>) =>
    setSteps((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const save = async () => {
    setBusy(true);
    setErr("");
    const payload = {
      name,
      description,
      defaultPriority,
      defaultDeadlineHours: Number(defaultDeadlineHours),
      steps: steps.map((s, i) => ({
        title: s.title,
        description: s.description || null,
        assigneeDepartment: s.assigneeDepartment || null,
        assigneeRole: s.assigneeRole || null,
        priority: s.priority,
        deadlineOffsetHours: Number(s.deadlineOffsetHours),
        orderIndex: i,
      })),
    };
    try {
      if (isNew) await api.post("/task-templates", payload);
      else await api.put(`/task-templates/${templateId}`, payload);
      router.push("/tasks/templates");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="mb-5 font-display text-[24px] font-bold text-brand-brown">
        {isNew ? "New Template" : "Edit Template"}
      </h1>

      <Card className="mb-5 p-5">
        <div className="flex flex-col gap-3">
          <input
            className={INPUT}
            placeholder="Template name (e.g. Dispatch order)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <textarea
            className={INPUT}
            rows={2}
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              className={INPUT}
              value={defaultPriority}
              onChange={(e) => setDefaultPriority(e.target.value)}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
            <input
              type="number"
              className={INPUT}
              placeholder="Deadline (hours)"
              value={defaultDeadlineHours}
              onChange={(e) =>
                setDefaultDeadlineHours(Number(e.target.value))
              }
            />
          </div>
        </div>
      </Card>

      <p className="mb-2 font-display text-[11px] font-semibold uppercase tracking-[.12em] text-brand-olive/70">
        Subtask steps
      </p>
      <div className="flex flex-col gap-4">
        {steps.map((s, i) => (
          <Card key={i} className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-display text-[11px] font-semibold uppercase tracking-[.12em] text-brand-olive/70">
                Step {i + 1}
              </span>
              {steps.length > 1 && (
                <button
                  className="text-[12px] text-danger"
                  onClick={() =>
                    setSteps((x) => x.filter((_, j) => j !== i))
                  }
                >
                  Remove
                </button>
              )}
            </div>
            <input
              className={`${INPUT} mb-2`}
              placeholder="Step title"
              value={s.title}
              onChange={(e) => setStep(i, { title: e.target.value })}
            />
            <textarea
              className={`${INPUT} mb-2`}
              rows={2}
              placeholder="Step description"
              value={s.description}
              onChange={(e) =>
                setStep(i, { description: e.target.value })
              }
            />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <select
                className={INPUT}
                value={s.assigneeDepartment}
                onChange={(e) =>
                  setStep(i, {
                    assigneeDepartment: e.target.value,
                    assigneeRole: "",
                  })
                }
              >
                <option value="">Dept (auto)</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <select
                className={INPUT}
                value={s.assigneeRole}
                onChange={(e) =>
                  setStep(i, { assigneeRole: e.target.value })
                }
              >
                <option value="">Role (auto)</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <select
                className={INPUT}
                value={s.priority}
                onChange={(e) =>
                  setStep(i, { priority: e.target.value })
                }
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
              <input
                type="number"
                className={INPUT}
                placeholder="Deadline offset (h)"
                value={s.deadlineOffsetHours}
                onChange={(e) =>
                  setStep(i, {
                    deadlineOffsetHours: Number(e.target.value),
                  })
                }
              />
            </div>
          </Card>
        ))}
      </div>

      <button
        className="mt-3 text-[12px] font-semibold text-brand-tan-dark"
        onClick={() =>
          setSteps((s) => [
            ...s,
            {
              title: "",
              description: "",
              assigneeDepartment: "",
              assigneeRole: "",
              priority: "MEDIUM",
              deadlineOffsetHours: 0,
            },
          ])
        }
      >
        + Add step
      </button>

      {err && (
        <p className="mt-3 text-[12px] text-danger">{err}</p>
      )}

      <div className="mt-5 flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/tasks/templates")}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          loading={busy}
          disabled={!name || steps.some((s) => !s.title)}
          onClick={save}
        >
          {isNew ? "Create template" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
