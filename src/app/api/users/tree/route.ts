import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

interface TreeNode {
  id: string;
  name: string;
  role: string;
  department: string;
  regionCode: string;
  reportsTo: string | null;
  children: TreeNode[];
}

export async function GET() {
  const auth = await getCurrentUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!actor) return NextResponse.json({ error: "Unknown user" }, { status: 401 });
  if (actor.role !== "ADMIN" && actor.role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where:
      actor.role === "ADMIN"
        ? { isActive: true }
        : { isActive: true, regionCode: actor.regionCode },
    select: {
      id: true,
      name: true,
      role: true,
      department: true,
      regionCode: true,
      reportsTo: true,
    },
  });

  const nodes = new Map<string, TreeNode>();
  for (const u of users) nodes.set(u.id, { ...u, children: [] });

  const roots: TreeNode[] = [];
  for (const node of nodes.values()) {
    if (node.reportsTo && nodes.has(node.reportsTo)) {
      nodes.get(node.reportsTo)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return NextResponse.json({ data: roots });
}
