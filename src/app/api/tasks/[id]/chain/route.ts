import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { visibleTaskIds } from "@/lib/tasks";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getCurrentUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!actor) return NextResponse.json({ error: "Unknown user" }, { status: 401 });

  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  if (actor.role !== "ADMIN" && task.regionCode !== actor.regionCode) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const rootId = task.rootTaskId ?? task.id;
  const chain = await prisma.task.findMany({
    where: { OR: [{ id: rootId }, { rootTaskId: rootId }] },
    orderBy: { createdAt: "asc" },
    include: {
      assignedTo: { select: { id: true, name: true, role: true, department: true } },
      assignedBy: { select: { id: true, name: true, role: true } },
    },
  });

  const visible = visibleTaskIds(
    { id: actor.id, role: actor.role },
    chain.map((t) => ({
      id: t.id,
      assignedToId: t.assignedToId,
      assignedById: t.assignedById,
      parentTaskId: t.parentTaskId,
    })),
  );
  if (!visible.has(id)) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({
    data: chain.filter((t) => visible.has(t.id)),
  });
}
