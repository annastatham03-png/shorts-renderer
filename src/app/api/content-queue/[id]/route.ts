import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { requireSessionUser } from "@/lib/session";

export const runtime = "nodejs";

const updateSchema = z.object({
  topic: z.string().min(1).optional(),
  script: z.string().min(1).optional(),
  status: z.enum(["draft", "review", "approved"]).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const limit = rateLimit(request);
  if (!limit.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await requireSessionUser();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const item = await prisma.contentQueueItem.update({
    where: { id: params.id, userId: user.id },
    data: parsed.data,
  });

  return NextResponse.json({ item });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const limit = rateLimit(request);
  if (!limit.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await requireSessionUser();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await prisma.contentQueueItem.delete({
    where: { id: params.id, userId: user.id },
  });

  return NextResponse.json({ ok: true });
}
