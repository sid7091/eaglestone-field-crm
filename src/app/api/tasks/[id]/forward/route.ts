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
      { error: "Only the current owner can forward this task" },
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
  const { assignedToId, deadline, note } = body ?? {};
  const target = await prisma.user.findUnique({ where: { id: assignedToId } });
  if (!target) {
    return NextResponse.json({ error: "Target user not found" }, { status: 404 });
  }
  if (!canAssign(actor, target)) {
    return NextResponse.json(
      { error: "You may not forward to this user" },
      { status: 403 },
    );
  }

  const newDeadline = deadline ? new Date(deadline) : task.deadline;
  if (newDeadline.getTime() > task.deadline.getTime()) {
    return NextResponse.json(
      { error: "Forwarded deadline cannot exceed the parent's" },
      { status: 400 },
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const child = await tx.task.create({
      data: {
        title: task.title,
        description: note
          ? `${task.description ?? ""}\n\n[Forwarded] ${note}`.trim()
          : task.description,
        regionCode: task.regionCode,
        assignedById: actor.id,
        assignedToId: target.id,
        parentTaskId: task.id,
        rootTaskId: task.rootTaskId ?? task.id,
        decomposition: "NONE",
        status: "PENDING",
        priority: task.priority,
        deadline: newDeadline,
        templateId: task.templateId,
      },
    });
    await tx.task.update({
      where: { id: task.id },
      data: { decomposition: "FORWARDED", status: "FORWARDED" },
    });
    return child;
  });

  return NextResponse.json(result, { status: 201 });
}
