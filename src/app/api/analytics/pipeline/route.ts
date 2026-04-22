import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST", "DORMANT"];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customers = await prisma.customer.findMany({
    select: { leadStatus: true, annualPotentialINR: true },
  });

  const pipeline = STATUSES.map((status) => {
    const matching = customers.filter((c) => c.leadStatus === status);
    return {
      status,
      count: matching.length,
      totalPotentialINR: matching.reduce((sum, c) => sum + (c.annualPotentialINR ?? 0), 0),
    };
  });

  return NextResponse.json({ data: pipeline });
}
