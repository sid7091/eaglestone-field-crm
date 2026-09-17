import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isOverdue } from "@/lib/tasks";

export async function GET() {
  const auth = await getCurrentUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const g = await prisma.userGamification.findUnique({
    where: { userId: auth.userId },
  });

  const open = await prisma.task.findMany({
    where: {
      assignedToId: auth.userId,
      status: {
        in: ["PENDING", "IN_PROGRESS", "FORWARDED", "BLOCKED_BY_SUBTASKS"],
      },
    },
    select: { status: true, deadline: true },
  });

  const overdue = open.filter((t) => isOverdue(t.status, t.deadline)).length;

  return NextResponse.json({
    gamification: g
      ? { ...g, badges: JSON.parse(g.badges || "[]") }
      : {
          userId: auth.userId,
          currentStreak: 0,
          bestStreak: 0,
          totalPoints: 0,
          tasksCompletedOnTime: 0,
          tasksCompletedLate: 0,
          badges: [],
          lastCompletionAt: null,
        },
    pending: open.length,
    overdue,
  });
}
