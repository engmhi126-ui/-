import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { UserRole } from "@/app/generated/prisma";

export async function GET() {
  await requireAuth();
  const settings = await prisma.officeSettings.findFirst();
  const telegram = await prisma.telegramSettings.findFirst();
  return Response.json({ office: settings, telegram });
}

export async function PATCH(request: NextRequest) {
  await requireAuth(UserRole.ADMIN);
  const body = await request.json();

  if (body.type === "telegram") {
    const { type: _, ...data } = body;
    const existing = await prisma.telegramSettings.findFirst();
    if (existing) {
      const updated = await prisma.telegramSettings.update({ where: { id: existing.id }, data });
      return Response.json(updated);
    }
    const created = await prisma.telegramSettings.create({ data });
    return Response.json(created);
  }

  const { type: _, ...data } = body;
  const existing = await prisma.officeSettings.findFirst();
  if (existing) {
    const updated = await prisma.officeSettings.update({ where: { id: existing.id }, data });
    return Response.json(updated);
  }
  const created = await prisma.officeSettings.create({ data });
  return Response.json(created);
}
