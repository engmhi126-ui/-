import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { AuditAction } from "@/app/generated/prisma";
import { generateWhatsAppReminder } from "@/lib/utils";
import { z } from "zod";

const reminderSchema = z.object({
  customerId: z.string(),
  voucherId: z.string().optional(),
  channel: z.enum(["whatsapp", "telegram", "sms"]).default("whatsapp"),
  message: z.string().min(1),
});

export async function GET(request: NextRequest) {
  await requireAuth();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const [reminders, total] = await Promise.all([
    prisma.reminderLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        customer: { select: { name: true, phone: true } },
        voucher: { select: { voucherNumber: true, remainingAmount: true } },
        sentBy: { select: { name: true } },
      },
    }),
    prisma.reminderLog.count({ where }),
  ]);

  return Response.json({ reminders, total, pages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const session = await requireAuth();

  try {
    const body = await request.json();

    // Bulk sending: array of customerIds
    if (Array.isArray(body)) {
      const results = [];
      for (const item of body) {
        const data = reminderSchema.parse(item);
        const reminder = await prisma.reminderLog.create({
          data: {
            customerId: data.customerId,
            voucherId: data.voucherId,
            sentById: session.userId,
            channel: data.channel,
            message: data.message,
            status: "SENT",
            sentAt: new Date(),
          },
        });
        results.push(reminder);
      }

      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: AuditAction.SEND_REMINDER,
          details: { count: results.length },
        },
      });

      return Response.json({ success: true, count: results.length });
    }

    // Single reminder
    const data = reminderSchema.parse(body);
    const reminder = await prisma.reminderLog.create({
      data: {
        customerId: data.customerId,
        voucherId: data.voucherId,
        sentById: session.userId,
        channel: data.channel,
        message: data.message,
        status: "SENT",
        sentAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: AuditAction.SEND_REMINDER,
        entityType: "customer",
        entityId: data.customerId,
      },
    });

    return Response.json(reminder, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "بيانات غير صحيحة" }, { status: 400 });
    }
    return Response.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

// GET outstanding customers for reminder center
export async function PUT(request: NextRequest) {
  await requireAuth();
  const { searchParams } = new URL(request.url);
  const minDays = parseInt(searchParams.get("minDays") || "0");
  const engineerId = searchParams.get("engineerId");

  const where: Record<string, unknown> = {
    deletedAt: null,
    status: "ISSUED",
    remainingAmount: { gt: 0 },
  };
  if (engineerId) where.engineerId = engineerId;
  if (minDays > 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - minDays);
    where.date = { lte: cutoff };
  }

  const vouchers = await prisma.voucher.findMany({
    where,
    include: { customer: true },
    orderBy: { remainingAmount: "desc" },
  });

  // Group by customer
  const map = new Map<
    string,
    { customer: (typeof vouchers)[0]["customer"]; totalRemaining: number; vouchers: typeof vouchers }
  >();
  for (const v of vouchers) {
    if (!map.has(v.customerId)) {
      map.set(v.customerId, { customer: v.customer, totalRemaining: 0, vouchers: [] });
    }
    const entry = map.get(v.customerId)!;
    entry.totalRemaining += Number(v.remainingAmount);
    entry.vouchers.push(v);
  }

  const settings = await prisma.officeSettings.findFirst();
  const officeName = settings?.officeName || "مكتب المطري للاستشارات الهندسية";
  const officePhone = settings?.phone || "+966538986031";

  const result = Array.from(map.values()).map((entry) => ({
    customer: entry.customer,
    totalRemaining: entry.totalRemaining,
    voucherCount: entry.vouchers.length,
    message: generateWhatsAppReminder(entry.customer.name, entry.totalRemaining, officeName, officePhone),
  }));

  return Response.json(result);
}
