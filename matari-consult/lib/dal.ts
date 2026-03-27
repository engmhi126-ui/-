// Data Access Layer - server-side only
import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "./session";
import { prisma } from "./db";
import { UserRole } from "@/app/generated/prisma";
import { canAccess } from "./auth";

export async function requireAuth(requiredRole?: UserRole) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (requiredRole && !canAccess(session.role, requiredRole)) {
    redirect("/dashboard?error=unauthorized");
  }
  return session;
}

export async function getDashboardStats() {
  const [
    totalVouchers,
    totalRevenue,
    totalCustomers,
    totalEngineers,
    outstanding,
    recentVouchers,
    byService,
    byPayment,
    monthlyRevenue,
    topCustomers,
    topEngineers,
  ] = await Promise.all([
    prisma.voucher.count({ where: { deletedAt: null, status: "ISSUED" } }),
    prisma.voucher.aggregate({
      where: { deletedAt: null, status: "ISSUED" },
      _sum: { paidAmount: true },
    }),
    prisma.customer.count({ where: { deletedAt: null } }),
    prisma.user.count({
      where: { deletedAt: null, isActive: true, role: { in: ["ENGINEER", "ADMIN"] } },
    }),
    prisma.voucher.aggregate({
      where: { deletedAt: null, status: "ISSUED", remainingAmount: { gt: 0 } },
      _sum: { remainingAmount: true },
      _count: true,
    }),
    prisma.voucher.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { customer: { select: { name: true } }, engineer: { select: { name: true } } },
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
    // Monthly revenue for last 6 months
    prisma.$queryRaw<Array<{ month: string; total: number }>>`
      SELECT TO_CHAR(date, 'YYYY-MM') as month, SUM("paidAmount")::float as total
      FROM vouchers
      WHERE "deletedAt" IS NULL AND status = 'ISSUED'
        AND date >= NOW() - INTERVAL '6 months'
      GROUP BY month ORDER BY month ASC
    `,
    // Top customers by paid amount
    prisma.voucher.groupBy({
      by: ["customerId", "customerName"],
      where: { deletedAt: null, status: "ISSUED" },
      _sum: { paidAmount: true },
      _count: true,
      orderBy: { _sum: { paidAmount: "desc" } },
      take: 5,
    }),
    // Top engineers
    prisma.voucher.groupBy({
      by: ["engineerId", "engineerName"],
      where: { deletedAt: null, status: "ISSUED" },
      _sum: { paidAmount: true },
      _count: true,
      orderBy: { _sum: { paidAmount: "desc" } },
      take: 5,
    }),
  ]);

  return {
    totalVouchers,
    totalRevenue: Number(totalRevenue._sum.paidAmount || 0),
    totalCustomers,
    totalEngineers,
    outstanding: {
      amount: Number(outstanding._sum.remainingAmount || 0),
      count: outstanding._count,
    },
    recentVouchers,
    byService,
    byPayment,
    monthlyRevenue,
    topCustomers,
    topEngineers,
  };
}

export async function getVouchers(filters: {
  search?: string;
  engineerId?: string;
  serviceType?: string;
  paymentMethod?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  const {
    search,
    engineerId,
    serviceType,
    paymentMethod,
    status,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = filters;

  const where: Record<string, unknown> = { deletedAt: null };
  if (search) {
    where.OR = [
      { voucherNumber: { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      { nationalId: { contains: search } },
    ];
  }
  if (engineerId) where.engineerId = engineerId;
  if (serviceType) where.serviceType = serviceType;
  if (paymentMethod) where.paymentMethod = paymentMethod;
  if (status) where.status = status;
  if (startDate || endDate) {
    where.date = {};
    if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate);
    if (endDate) (where.date as Record<string, unknown>).lte = new Date(endDate);
  }

  const [vouchers, total] = await Promise.all([
    prisma.voucher.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        customer: { select: { name: true, phone: true } },
        engineer: { select: { name: true } },
      },
    }),
    prisma.voucher.count({ where }),
  ]);

  return { vouchers, total, pages: Math.ceil(total / limit) };
}
