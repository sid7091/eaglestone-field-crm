import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const auth = await getCurrentUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await prisma.taskTemplate.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: { steps: { orderBy: { orderIndex: "asc" } } },
  });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const auth = await getCurrentUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only an admin may create templates" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const { name, description, defaultPriority, defaultDeadlineHours, steps } =
    body ?? {};
  if (!name || !Array.isArray(steps) || steps.length < 1) {
    return NextResponse.json(
      { error: "Name and at least one step are required" },
      { status: 400 },
    );
  }

  const template = await prisma.taskTemplate.create({
    data: {
      name,
      description: description ?? null,
      defaultPriority: defaultPriority ?? "MEDIUM",
      defaultDeadlineHours: defaultDeadlineHours ?? 72,
      createdById: auth.userId,
      steps: {
        create: steps.map(
          (
            s: Record<string, unknown>,
            i: number,
          ) => ({
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

  return NextResponse.json(template, { status: 201 });
}
