import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { AuditAction } from "@/app/generated/prisma";
import { z } from "zod";

const customerSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  nationalId: z.string().optional(),
  phone: z.string().min(9, "رقم الجوال مطلوب"),
  email: z.string().email().optional().or(z.literal("")),
  district: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  await requireAuth();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: Record<string, unknown> = { deletedAt: null };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      { nationalId: { contains: search } },
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { vouchers: { where: { deletedAt: null } } } },
        vouchers: {
          where: { deletedAt: null, status: "ISSUED" },
          select: { paidAmount: true, remainingAmount: true, totalAmount: true },
        },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  const enriched = customers.map((c) => ({
    ...c,
    totalPaid: c.vouchers.reduce((s, v) => s + Number(v.paidAmount), 0),
    totalRemaining: c.vouchers.reduce((s, v) => s + Number(v.remainingAmount), 0),
    totalContract: c.vouchers.reduce((s, v) => s + Number(v.totalAmount), 0),
    voucherCount: c._count.vouchers,
  }));

  return Response.json({ customers: enriched, total, pages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const session = await requireAuth();

  try {
    const body = await request.json();
    const data = customerSchema.parse(body);

    const customer = await prisma.customer.create({ data });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: AuditAction.CREATE_CUSTOMER,
        entityType: "customer",
        entityId: customer.id,
        details: { name: customer.name },
      },
    });

    return Response.json(customer, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "بيانات غير صحيحة", details: error.issues }, { status: 400 });
    }
    return Response.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
