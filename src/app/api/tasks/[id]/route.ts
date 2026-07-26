import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { visibleTaskIds } from "@/lib/tasks";

async function loadChainIds(rootId: string) {
  return prisma.task.findMany({
    where: { OR: [{ id: rootId }, { rootTaskId: rootId }] },
    select: {
      id: true,
      assignedToId: true,
      assignedById: true,
      parentTaskId: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getCurrentUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!actor) return NextResponse.json({ error: "Unknown user" }, { status: 401 });

  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true, role: true, department: true } },
      assignedBy: { select: { id: true, name: true, role: true } },
    },
  });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  if (actor.role !== "ADMIN" && task.regionCode !== actor.regionCode) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const chain = await loadChainIds(task.rootTaskId ?? task.id);
  const visible = visibleTaskIds({ id: actor.id, role: actor.role }, chain);
  if (!visible.has(id)) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const children = await prisma.task.findMany({
    where: { parentTaskId: id },
    include: {
      assignedTo: { select: { id: true, name: true, role: true, department: true } },
    },
  });

  return NextResponse.json({ ...task, children });
}

export async function PATCH(
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

  const isAdmin = actor.role === "ADMIN";
  if (!isAdmin && task.assignedToId !== actor.id) {
    return NextResponse.json({ error: "Not your task" }, { status: 403 });
  }
  if (task.status === "COMPLETED" || task.status === "CANCELLED") {
    return NextResponse.json({ error: "Task is closed" }, { status: 409 });
  }

  const body = await request.json();
  const data: Record<string, unknown> = {};

  if (body.status === "IN_PROGRESS") {
    if (task.decomposition !== "NONE") {
      return NextResponse.json(
        { error: "Delegated/split tasks cannot be worked directly" },
        { status: 409 },
      );
    }
    data.status = "IN_PROGRESS";
  }
  if (body.priority) data.priority = body.priority;
  if (body.description !== undefined) data.description = body.description;
  if (body.deadline !== undefined) {
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only an admin may change the deadline" },
        { status: 403 },
      );
    }
    data.deadline = new Date(body.deadline);
  }

  const updated = await prisma.task.update({ where: { id }, data });
  return NextResponse.json(updated);
}
