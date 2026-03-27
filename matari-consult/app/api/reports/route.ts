import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/dal";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  await requireAuth();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "summary";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const engineerId = searchParams.get("engineerId");

  const dateFilter: Record<string, unknown> = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate + "T23:59:59");

  const baseWhere: Record<string, unknown> = { deletedAt: null, status: "ISSUED" };
  if (startDate || endDate) baseWhere.date = dateFilter;
  if (engineerId) baseWhere.engineerId = engineerId;

  if (type === "summary") {
    const [revenue, outstanding, byService, byPayment, byEngineer] = await Promise.all([
      prisma.voucher.aggregate({ where: baseWhere, _sum: { paidAmount: true, remainingAmount: true, totalAmount: true }, _count: true }),
      prisma.voucher.count({ where: { ...baseWhere, remainingAmount: { gt: 0 } } }),
      prisma.voucher.groupBy({ by: ["serviceType"], where: baseWhere, _sum: { paidAmount: true }, _count: true }),
      prisma.voucher.groupBy({ by: ["paymentMethod"], where: baseWhere, _sum: { paidAmount: true }, _count: true }),
      prisma.voucher.groupBy({ by: ["engineerName"], where: baseWhere, _sum: { paidAmount: true }, _count: true, orderBy: { _sum: { paidAmount: "desc" } } }),
    ]);

    return Response.json({ revenue, outstanding, byService, byPayment, byEngineer });
  }

  if (type === "vouchers") {
    const vouchers = await prisma.voucher.findMany({
      where: baseWhere,
      orderBy: { date: "desc" },
      include: { customer: { select: { name: true } }, engineer: { select: { name: true } } },
    });
    return Response.json(vouchers);
  }

  if (type === "customers") {
    const customers = await prisma.voucher.groupBy({
      by: ["customerId", "customerName"],
      where: baseWhere,
      _sum: { paidAmount: true, remainingAmount: true, totalAmount: true },
      _count: true,
      orderBy: { _sum: { paidAmount: "desc" } },
    });
    return Response.json(customers);
  }

  return Response.json({ error: "نوع التقرير غير معروف" }, { status: 400 });
}
