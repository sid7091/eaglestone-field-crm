"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { api } from "@/lib/api-client";

interface Tmpl {
  id: string;
  name: string;
  description: string | null;
  defaultPriority: string;
  steps: { id: string }[];
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Tmpl[]>([]);
  const [me, setMe] = useState<{ role: string } | null>(null);

  const load = () =>
    api
      .get<{ data: Tmpl[] }>("/task-templates")
      .then((r) => setTemplates(r.data))
      .catch(() => {});

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => d.user && setMe(d.user))
      .catch(() => {});
    load();
  }, []);

  const isAdmin = me?.role === "ADMIN";

  const remove = async (id: string) => {
    await api.delete(`/task-templates/${id}`);
    load();
  };

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="font-display text-[10px] font-semibold tracking-[.2em] text-brand-olive/50">
            COORDINATION
          </p>
          <h1 className="mt-1 font-display text-[28px] font-bold text-brand-brown">
            Task Templates
          </h1>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            onClick={() => router.push("/tasks/templates/new")}
          >
            + NEW TEMPLATE
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <Card key={t.id} className="p-4">
            <h3 className="font-display text-[15px] font-bold text-brand-brown">
              {t.name}
            </h3>
            <p className="mt-1 text-[12px] text-brand-olive/60">
              {t.description || "No description"}
            </p>
            <p className="mt-2 text-[11px] text-brand-olive/50">
              {t.steps.length} steps · {t.defaultPriority}
            </p>
            {isAdmin && (
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    router.push(`/tasks/templates/${t.id}`)
                  }
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => remove(t.id)}
                >
                  Delete
                </Button>
              </div>
            )}
          </Card>
        ))}
        {templates.length === 0 && (
          <p className="text-[13px] text-brand-olive/50">
            No templates yet.
          </p>
        )}
      </div>
    </div>
  );
}
