import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { AuditAction, UserRole } from "@/app/generated/prisma";
import { z } from "zod";

const updateSchema = z.object({
  notes: z.string().optional(),
  accountantName: z.string().optional(),
  managementName: z.string().optional(),
  status: z.enum(["DRAFT", "ISSUED", "CANCELLED"]).optional(),
  paidAmount: z.number().min(0).optional(),
  description: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  const { id } = await ctx.params;

  const voucher = await prisma.voucher.findUnique({
    where: { id, deletedAt: null },
    include: {
      customer: true,
      engineer: { select: { name: true, phone: true, email: true } },
      reminders: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!voucher) return Response.json({ error: "السند غير موجود" }, { status: 404 });

  // Engineers can only see their own vouchers
  if (session.role === UserRole.ENGINEER && voucher.engineerId !== session.userId) {
    return Response.json({ error: "غير مصرح" }, { status: 403 });
  }

  return Response.json(voucher);
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  const { id } = await ctx.params;

  const voucher = await prisma.voucher.findUnique({ where: { id, deletedAt: null } });
  if (!voucher) return Response.json({ error: "السند غير موجود" }, { status: 404 });

  if (
    session.role === UserRole.ENGINEER &&
    (voucher.engineerId !== session.userId || voucher.status === "ISSUED")
  ) {
    return Response.json({ error: "غير مصرح بالتعديل" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    const updated = await prisma.voucher.update({
      where: { id },
      data: {
        ...data,
        remainingAmount:
          data.paidAmount !== undefined
            ? Number(voucher.totalAmount) - data.paidAmount
            : undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: AuditAction.EDIT_VOUCHER,
        entityType: "voucher",
        entityId: id,
        details: { changes: data },
      },
    });

    return Response.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });
    }
    return Response.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth(UserRole.ADMIN);
  const { id } = await ctx.params;

  const voucher = await prisma.voucher.findUnique({ where: { id, deletedAt: null } });
  if (!voucher) return Response.json({ error: "السند غير موجود" }, { status: 404 });

  await prisma.voucher.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: AuditAction.DELETE_VOUCHER,
      entityType: "voucher",
      entityId: id,
      details: { voucherNumber: voucher.voucherNumber },
    },
  });

  return Response.json({ success: true });
}
