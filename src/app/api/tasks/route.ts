import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAssign, canOriginate, isSenior } from "@/lib/tasks";

export async function GET(request: NextRequest) {
  const auth = await getCurrentUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!actor) return NextResponse.json({ error: "Unknown user" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const limit = Math.min(200, Math.max(1, parseInt(sp.get("limit") || "50", 10)));

  const where: Record<string, unknown> = {};
  if (actor.role !== "ADMIN") {
    where.regionCode = actor.regionCode;
    if (!isSenior(actor.role)) {
      where.OR = [{ assignedToId: actor.id }, { assignedById: actor.id }];
    }
  }
  if (sp.get("mine") === "true") where.assignedToId = actor.id;
  if (sp.get("assignedToId")) where.assignedToId = sp.get("assignedToId");
  if (sp.get("assignedById")) where.assignedById = sp.get("assignedById");
  if (sp.get("status")) where.status = sp.get("status");
  if (sp.get("priority")) where.priority = sp.get("priority");
  if (sp.get("templateId")) where.templateId = sp.get("templateId");

  const [data, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        assignedTo: { select: { id: true, name: true, role: true, department: true } },
        assignedBy: { select: { id: true, name: true, role: true } },
      },
    }),
    prisma.task.count({ where }),
  ]);

  return NextResponse.json({
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const auth = await getCurrentUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!actor) return NextResponse.json({ error: "Unknown user" }, { status: 401 });
  if (!canOriginate(actor.role)) {
    return NextResponse.json(
      { error: "Your role may not create top-level tasks" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const { title, description, assignedToId, deadline, priority } = body ?? {};
  if (!title || typeof title !== "string" || title.length < 2) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!assignedToId || !deadline) {
    return NextResponse.json(
      { error: "assignedToId and deadline are required" },
      { status: 400 },
    );
  }

  const target = await prisma.user.findUnique({ where: { id: assignedToId } });
  if (!target) {
    return NextResponse.json({ error: "Assignee not found" }, { status: 404 });
  }
  if (!canAssign(actor, target)) {
    return NextResponse.json(
      { error: "You may not assign tasks to this user" },
      { status: 403 },
    );
  }

  const created = await prisma.task.create({
    data: {
      title,
      description: description ?? null,
      regionCode: actor.regionCode,
      assignedById: actor.id,
      assignedToId,
      decomposition: "NONE",
      status: "PENDING",
      priority: priority ?? "MEDIUM",
      deadline: new Date(deadline),
    },
  });
  // self-rooted
  const task = await prisma.task.update({
    where: { id: created.id },
    data: { rootTaskId: created.id },
  });

  return NextResponse.json(task, { status: 201 });
}
