import { prisma } from "@/lib/prisma";

export interface StepResolution {
  stepId: string;
  title: string;
  resolvedUserId: string | null;
  resolvedUserName: string | null;
  reason?: string;
}

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
type DB = typeof prisma | TxClient;

interface StepLike {
  id: string;
  title: string;
  assigneeUserId: string | null;
  assigneeDepartment: string | null;
  assigneeRole: string | null;
}

/**
 * Resolve a step to a concrete user, scoped to `regionCode`.
 * Priority: pinned user → department+region → role+region (oldest first).
 */
export async function resolveStep(
  db: DB,
  step: StepLike,
  regionCode: string,
): Promise<{ userId: string | null; name: string | null; reason?: string }> {
  if (step.assigneeUserId) {
    const u = await db.user.findFirst({
      where: { id: step.assigneeUserId, isActive: true },
    });
    return u
      ? { userId: u.id, name: u.name }
      : { userId: null, name: null, reason: "Pinned user not found/inactive" };
  }
  if (step.assigneeDepartment) {
    const u = await db.user.findFirst({
      where: {
        department: step.assigneeDepartment,
        regionCode,
        isActive: true,
      },
      orderBy: { createdAt: "asc" },
    });
    return u
      ? { userId: u.id, name: u.name }
      : {
          userId: null,
          name: null,
          reason: `No active ${step.assigneeDepartment} user in region ${regionCode}`,
        };
  }
  if (step.assigneeRole) {
    const u = await db.user.findFirst({
      where: { role: step.assigneeRole, regionCode, isActive: true },
      orderBy: { createdAt: "asc" },
    });
    return u
      ? { userId: u.id, name: u.name }
      : {
          userId: null,
          name: null,
          reason: `No active ${step.assigneeRole} user in region ${regionCode}`,
        };
  }
  return { userId: null, name: null, reason: "Step has no assignee rule" };
}

export async function previewResolution(
  templateId: string,
  regionCode: string,
): Promise<StepResolution[]> {
  const template = await prisma.taskTemplate.findUnique({
    where: { id: templateId },
    include: { steps: { orderBy: { orderIndex: "asc" } } },
  });
  if (!template) throw new Error("Template not found");

  const out: StepResolution[] = [];
  for (const step of template.steps) {
    const r = await resolveStep(prisma, step, regionCode);
    out.push({
      stepId: step.id,
      title: step.title,
      resolvedUserId: r.userId,
      resolvedUserName: r.name,
      reason: r.reason,
    });
  }
  return out;
}
