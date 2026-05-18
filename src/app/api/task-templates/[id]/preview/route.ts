import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canOriginate } from "@/lib/tasks";
import { previewResolution } from "@/lib/task-templates.server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getCurrentUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!actor || !canOriginate(actor.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const regionCode = body?.regionCode || actor.regionCode;

  try {
    const data = await previewResolution(id, regionCode);
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
}
