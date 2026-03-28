import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { AuditAction, UserRole } from "@/app/generated/prisma";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  await requireAuth();
  const { id } = await ctx.params;

  const customer = await prisma.customer.findUnique({
    where: { id, deletedAt: null },
    include: {
      vouchers: {
        where: { deletedAt: null },
        orderBy: { date: "desc" },
        include: { engineer: { select: { name: true } } },
      },
      reminders: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { sentBy: { select: { name: true } } },
      },
    },
  });

  if (!customer) return Response.json({ error: "العميل غير موجود" }, { status: 404 });

  const stats = {
    totalPaid: customer.vouchers
      .filter((v) => v.status === "ISSUED")
      .reduce((s, v) => s + Number(v.paidAmount), 0),
    totalRemaining: customer.vouchers
      .filter((v) => v.status === "ISSUED")
      .reduce((s, v) => s + Number(v.remainingAmount), 0),
    totalContract: customer.vouchers
      .filter((v) => v.status === "ISSUED")
      .reduce((s, v) => s + Number(v.totalAmount), 0),
  };

  return Response.json({ ...customer, stats });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  const { id } = await ctx.params;

  const body = await req.json();
  const customer = await prisma.customer.update({ where: { id }, data: body });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: AuditAction.EDIT_CUSTOMER,
      entityType: "customer",
      entityId: id,
    },
  });

  return Response.json(customer);
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth(UserRole.ADMIN);
  const { id } = await ctx.params;

  await prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: AuditAction.DELETE_CUSTOMER,
      entityType: "customer",
      entityId: id,
    },
  });

  return Response.json({ success: true });
}
