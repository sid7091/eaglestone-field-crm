import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
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

  const rootId = task.rootTaskId ?? task.id;
  const root = await prisma.task.findUnique({ where: { id: rootId } });
  const isRootOwner = root?.assignedById === actor.id;
  if (actor.role !== "ADMIN" && !isRootOwner) {
    return NextResponse.json(
      { error: "Only an admin or the originator may cancel" },
      { status: 403 },
    );
  }

  const chain = await prisma.task.findMany({
    where: { OR: [{ id: rootId }, { rootTaskId: rootId }] },
  });

  // Collect this task + all descendants
  const descendants = new Set<string>([task.id]);
  let added = true;
  while (added) {
    added = false;
    for (const t of chain) {
      if (
        t.parentTaskId &&
        descendants.has(t.parentTaskId) &&
        !descendants.has(t.id)
      ) {
        descendants.add(t.id);
        added = true;
      }
    }
  }

  const toCancel = chain
    .filter(
      (t) =>
        descendants.has(t.id) &&
        t.status !== "COMPLETED" &&
        t.status !== "CANCELLED",
    )
    .map((t) => t.id);

  await prisma.task.updateMany({
    where: { id: { in: toCancel } },
    data: { status: "CANCELLED" },
  });

  return NextResponse.json({ cancelled: toCancel.length });
}
