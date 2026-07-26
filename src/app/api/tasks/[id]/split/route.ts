import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAssign, MAX_TASK_DEPTH } from "@/lib/tasks";

async function depth(taskId: string): Promise<number> {
  let d = 0;
  let cursor: string | null = taskId;
  while (cursor) {
    const t: { parentTaskId: string | null } | null =
      await prisma.task.findUnique({
        where: { id: cursor },
        select: { parentTaskId: true },
      });
    if (!t?.parentTaskId) break;
    d += 1;
    cursor = t.parentTaskId;
    if (d > MAX_TASK_DEPTH + 1) break;
  }
  return d;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getCurrentUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!actor) return NextResponse.json({ error: "Unknown user" }, { status: 401 });

  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  if (task.assignedToId !== actor.id) {
    return NextResponse.json(
      { error: "Only the current owner can split this task" },
      { status: 403 },
    );
  }
  if (task.decomposition !== "NONE") {
    return NextResponse.json(
      { error: "Task has already been forwarded or split" },
      { status: 409 },
    );
  }
  if ((await depth(task.id)) >= MAX_TASK_DEPTH) {
    return NextResponse.json(
      { error: "Maximum delegation depth reached" },
      { status: 409 },
    );
  }

  const body = await request.json();
  const subtasks = body?.subtasks;
  if (!Array.isArray(subtasks) || subtasks.length < 2) {
    return NextResponse.json(
      { error: "Provide at least 2 subtasks" },
      { status: 400 },
    );
  }

  for (const sub of subtasks) {
    if (!sub.title || !sub.assignedToId || !sub.deadline) {
      return NextResponse.json(
        { error: "Each subtask needs title, assignedToId and deadline" },
        { status: 400 },
      );
    }
    const target = await prisma.user.findUnique({
      where: { id: sub.assignedToId },
    });
    if (!target) {
      return NextResponse.json(
        { error: `Assignee ${sub.assignedToId} not found` },
        { status: 404 },
      );
    }
    if (!canAssign(actor, target)) {
      return NextResponse.json(
        { error: `You may not assign a subtask to ${target.name}` },
        { status: 403 },
      );
    }
    if (new Date(sub.deadline).getTime() > task.deadline.getTime()) {
      return NextResponse.json(
        { error: `Subtask "${sub.title}" deadline exceeds the parent's` },
        { status: 400 },
      );
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    const children = [];
    for (const sub of subtasks) {
      children.push(
        await tx.task.create({
          data: {
            title: sub.title,
            description: sub.description ?? null,
            regionCode: task.regionCode,
            assignedById: actor.id,
            assignedToId: sub.assignedToId,
            parentTaskId: task.id,
            rootTaskId: task.rootTaskId ?? task.id,
            decomposition: "NONE",
            status: "PENDING",
            priority: sub.priority ?? "MEDIUM",
            deadline: new Date(sub.deadline),
            templateId: task.templateId,
          },
        }),
      );
    }
    await tx.task.update({
      where: { id: task.id },
      data: { decomposition: "SUBTASKS", status: "BLOCKED_BY_SUBTASKS" },
    });
    return children;
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
