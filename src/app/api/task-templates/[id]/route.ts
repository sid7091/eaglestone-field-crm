import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getCurrentUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const template = await prisma.taskTemplate.findUnique({
    where: { id },
    include: { steps: { orderBy: { orderIndex: "asc" } } },
  });
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
  return NextResponse.json(template);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getCurrentUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name, description, defaultPriority, defaultDeadlineHours, steps } =
    body ?? {};
  if (!name || !Array.isArray(steps) || steps.length < 1) {
    return NextResponse.json(
      { error: "Name and at least one step are required" },
      { status: 400 },
    );
  }

  const existing = await prisma.taskTemplate.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.taskTemplateStep.deleteMany({ where: { templateId: id } });
    return tx.taskTemplate.update({
      where: { id },
      data: {
        name,
        description: description ?? null,
        defaultPriority: defaultPriority ?? "MEDIUM",
        defaultDeadlineHours: defaultDeadlineHours ?? 72,
        steps: {
          create: steps.map(
            (s: Record<string, unknown>, i: number) => ({
              title: s.title as string,
              description: (s.description as string) ?? null,
              assigneeRole: (s.assigneeRole as string) || null,
              assigneeDepartment: (s.assigneeDepartment as string) || null,
              assigneeUserId: (s.assigneeUserId as string) || null,
              priority: (s.priority as string) ?? "MEDIUM",
              deadlineOffsetHours: (s.deadlineOffsetHours as number) ?? 0,
              orderIndex: (s.orderIndex as number) ?? i,
            }),
          ),
        },
      },
      include: { steps: true },
    });
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getCurrentUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.taskTemplate.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
  await prisma.taskTemplate.update({
    where: { id },
    data: { isActive: false },
  });
  return NextResponse.json({ ok: true });
}
