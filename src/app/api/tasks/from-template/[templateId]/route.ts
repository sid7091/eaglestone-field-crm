import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canOriginate } from "@/lib/tasks";
import { resolveStep, StepResolution } from "@/lib/task-templates.server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> },
) {
  const auth = await getCurrentUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!actor) return NextResponse.json({ error: "Unknown user" }, { status: 401 });
  if (!canOriginate(actor.role)) {
    return NextResponse.json(
      { error: "Your role may not instantiate templates" },
      { status: 403 },
    );
  }

  const { templateId } = await params;
  const body = await request.json().catch(() => ({}));
  const regionCode = body?.regionCode || actor.regionCode;
  const deadlineOverrideHours = body?.deadlineOverrideHours as
    | number
    | undefined;

  const template = await prisma.taskTemplate.findFirst({
    where: { id: templateId, isActive: true },
    include: { steps: { orderBy: { orderIndex: "asc" } } },
  });
  if (!template) {
    return NextResponse.json(
      { error: "Template not found or inactive" },
      { status: 404 },
    );
  }

  // Resolve all steps up front
  const resolved: { stepId: string; userId: string }[] = [];
  const failures: StepResolution[] = [];
  for (const step of template.steps) {
    const r = await resolveStep(prisma, step, regionCode);
    if (r.userId) resolved.push({ stepId: step.id, userId: r.userId });
    else
      failures.push({
        stepId: step.id,
        title: step.title,
        resolvedUserId: null,
        resolvedUserName: null,
        reason: r.reason,
      });
  }
  if (failures.length > 0) {
    return NextResponse.json(
      {
        error: "One or more template steps could not be assigned",
        unresolved: failures,
      },
      { status: 422 },
    );
  }

  const now = Date.now();
  const rootDeadline = new Date(
    now + (deadlineOverrideHours ?? template.defaultDeadlineHours) * 3_600_000,
  );

  const root = await prisma.$transaction(async (tx) => {
    const created = await tx.task.create({
      data: {
        title: template.name,
        description: template.description,
        regionCode,
        assignedById: actor.id,
        assignedToId: actor.id,
        decomposition: "SUBTASKS",
        status: "BLOCKED_BY_SUBTASKS",
        priority: template.defaultPriority,
        deadline: rootDeadline,
        templateId: template.id,
      },
    });
    await tx.task.update({
      where: { id: created.id },
      data: { rootTaskId: created.id },
    });

    for (const step of template.steps) {
      const match = resolved.find((r) => r.stepId === step.id)!;
      await tx.task.create({
        data: {
          title: step.title,
          description: step.description,
          regionCode,
          assignedById: actor.id,
          assignedToId: match.userId,
          parentTaskId: created.id,
          rootTaskId: created.id,
          decomposition: "NONE",
          status: "PENDING",
          priority: step.priority,
          deadline: new Date(
            rootDeadline.getTime() + step.deadlineOffsetHours * 3_600_000,
          ),
          templateId: template.id,
        },
      });
    }
    return created;
  });

  return NextResponse.json(root, { status: 201 });
}
