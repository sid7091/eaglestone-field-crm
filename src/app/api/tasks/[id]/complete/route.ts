import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { computePoints, earnedBadges } from "@/lib/tasks";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getCurrentUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!actor) return NextResponse.json({ error: "Unknown user" }, { status: 401 });

  const { id } = await params;

  const outcome = await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({ where: { id } });
    if (!task) return { code: 404, body: { error: "Task not found" } };
    if (task.assignedToId !== actor.id && actor.role !== "ADMIN") {
      return { code: 403, body: { error: "Not your task" } };
    }
    if (task.decomposition !== "NONE") {
      return {
        code: 400,
        body: { error: "Task has active children; complete those first" },
      };
    }
    if (task.status === "COMPLETED") {
      return { code: 409, body: { error: "Already completed" } };
    }

    const now = new Date();
    const onTime = now.getTime() <= task.deadline.getTime();

    await tx.task.update({
      where: { id: task.id },
      data: { status: "COMPLETED", completedAt: now, completedOnTime: onTime },
    });

    // Gamification — only for the executor of this leaf
    const g =
      (await tx.userGamification.findUnique({
        where: { userId: task.assignedToId },
      })) ??
      (await tx.userGamification.create({
        data: { userId: task.assignedToId },
      }));

    let currentStreak = g.currentStreak;
    let totalPoints = g.totalPoints;
    const data: Record<string, unknown> = { lastCompletionAt: now };
    if (onTime) {
      currentStreak = g.currentStreak + 1;
      totalPoints =
        g.totalPoints + computePoints(task.priority, task.deadline, now);
      data.currentStreak = currentStreak;
      data.bestStreak = Math.max(g.bestStreak, currentStreak);
      data.totalPoints = totalPoints;
      data.tasksCompletedOnTime = g.tasksCompletedOnTime + 1;
    } else {
      currentStreak = 0;
      data.currentStreak = 0;
      data.tasksCompletedLate = g.tasksCompletedLate + 1;
    }
    const existing = JSON.parse(g.badges || "[]") as string[];
    data.badges = JSON.stringify(
      earnedBadges(existing, { currentStreak, totalPoints }),
    );
    await tx.userGamification.update({
      where: { userId: task.assignedToId },
      data,
    });

    // Bubble up
    let parentId = task.parentTaskId;
    while (parentId) {
      const parent = await tx.task.findUnique({ where: { id: parentId } });
      if (!parent) break;

      if (parent.decomposition === "FORWARDED") {
        await tx.task.update({
          where: { id: parent.id },
          data: {
            status: "COMPLETED",
            completedAt: now,
            completedOnTime: now.getTime() <= parent.deadline.getTime(),
          },
        });
        parentId = parent.parentTaskId;
        continue;
      }
      if (parent.decomposition === "SUBTASKS") {
        const siblings = await tx.task.findMany({
          where: { parentTaskId: parent.id },
        });
        const allDone = siblings.every(
          (s) => s.status === "COMPLETED" || s.status === "CANCELLED",
        );
        if (!allDone) break;
        await tx.task.update({
          where: { id: parent.id },
          data: {
            status: "COMPLETED",
            completedAt: now,
            completedOnTime: now.getTime() <= parent.deadline.getTime(),
          },
        });
        parentId = parent.parentTaskId;
        continue;
      }
      break;
    }

    const fresh = await tx.task.findUnique({ where: { id: task.id } });
    return { code: 200, body: fresh };
  });

  return NextResponse.json(outcome.body, { status: outcome.code });
}
