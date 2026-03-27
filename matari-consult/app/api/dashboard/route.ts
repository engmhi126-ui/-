import { requireAuth } from "@/lib/dal";
import { prisma } from "@/lib/db";

export async function GET() {
  await requireAuth();

  const [
    totalVouchers,
    totalRevenue,
    totalCustomers,
    outstanding,
    byService,
    byPayment,
    recentVouchers,
    topCustomers,
    topEngineers,
  ] = await Promise.all([
    prisma.voucher.count({ where: { deletedAt: null, status: "ISSUED" } }),
    prisma.voucher.aggregate({
      where: { deletedAt: null, status: "ISSUED" },
      _sum: { paidAmount: true },
    }),
    prisma.customer.count({ where: { deletedAt: null } }),
    prisma.voucher.aggregate({
      where: { deletedAt: null, status: "ISSUED", remainingAmount: { gt: 0 } },
      _sum: { remainingAmount: true },
      _count: true,
    }),
    prisma.voucher.groupBy({
      by: ["serviceType"],
      where: { deletedAt: null, status: "ISSUED" },
      _sum: { paidAmount: true },
      _count: true,
    }),
    prisma.voucher.groupBy({
      by: ["paymentMethod"],
      where: { deletedAt: null, status: "ISSUED" },
      _sum: { paidAmount: true },
      _count: true,
    }),
    prisma.voucher.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        customer: { select: { name: true } },
        engineer: { select: { name: true } },
      },
    }),
    prisma.voucher.groupBy({
      by: ["customerId", "customerName"],
      where: { deletedAt: null, status: "ISSUED" },
      _sum: { paidAmount: true },
      _count: true,
      orderBy: { _sum: { paidAmount: "desc" } },
      take: 5,
    }),
    prisma.voucher.groupBy({
      by: ["engineerId", "engineerName"],
      where: { deletedAt: null, status: "ISSUED" },
      _sum: { paidAmount: true },
      _count: true,
      orderBy: { _sum: { paidAmount: "desc" } },
      take: 5,
    }),
  ]);

  // Monthly revenue (last 6 months) using raw query
  const monthlyRevenue = await prisma.$queryRaw<
    Array<{ month: string; total: number; count: number }>
  >`
    SELECT
      TO_CHAR(date, 'YYYY-MM') as month,
      SUM("paidAmount")::float as total,
      COUNT(*)::int as count
    FROM vouchers
    WHERE "deletedAt" IS NULL AND status = 'ISSUED'
      AND date >= NOW() - INTERVAL '6 months'
    GROUP BY month
    ORDER BY month ASC
  `;

  return Response.json({
    totalVouchers,
    totalRevenue: Number(totalRevenue._sum.paidAmount || 0),
    totalCustomers,
    outstanding: {
      amount: Number(outstanding._sum.remainingAmount || 0),
      count: outstanding._count,
    },
    byService: byService.map((s) => ({
      type: s.serviceType,
      total: Number(s._sum.paidAmount || 0),
      count: s._count,
    })),
    byPayment: byPayment.map((p) => ({
      method: p.paymentMethod,
      total: Number(p._sum.paidAmount || 0),
      count: p._count,
    })),
    recentVouchers,
    topCustomers,
    topEngineers,
    monthlyRevenue,
  });
}
