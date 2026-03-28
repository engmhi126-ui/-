/**
 * n8n Data Endpoint — Read-only data for n8n workflows
 * GET /api/n8n/data?type=customers|vouchers|summary
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

function verifyApiKey(request: NextRequest): boolean {
  const apiKey = process.env.N8N_API_KEY;
  if (!apiKey) return true;
  const incoming = request.headers.get("X-N8N-API-Key") || request.headers.get("x-n8n-api-key");
  return incoming === apiKey;
}

export async function GET(request: NextRequest) {
  if (!verifyApiKey(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "summary";

  switch (type) {

    case "customers": {
      const customers = await prisma.customer.findMany({
        where: { deletedAt: null },
        select: {
          id: true, name: true, phone: true, nationalId: true,
          district: true, city: true, email: true, createdAt: true,
          _count: { select: { vouchers: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return Response.json({ ok: true, count: customers.length, customers });
    }

    case "vouchers": {
      const limit = parseInt(searchParams.get("limit") || "50");
      const status = searchParams.get("status");
      const vouchers = await prisma.voucher.findMany({
        where: {
          deletedAt: null,
          ...(status ? { status: status as "DRAFT" | "ISSUED" | "CANCELLED" } : {}),
        },
        select: {
          id: true, voucherNumber: true, date: true,
          customerName: true, phone: true,
          totalAmount: true, paidAmount: true, remainingAmount: true,
          paymentMethod: true, serviceType: true, status: true,
          engineerName: true,
        },
        orderBy: { date: "desc" },
        take: limit,
      });
      return Response.json({ ok: true, count: vouchers.length, vouchers });
    }

    case "summary": {
      const [totalVouchers, outstanding, revenue, customersCount] = await Promise.all([
        prisma.voucher.count({ where: { deletedAt: null } }),
        prisma.voucher.aggregate({
          where: { deletedAt: null, status: "ISSUED", remainingAmount: { gt: 0 } },
          _sum: { remainingAmount: true },
          _count: true,
        }),
        prisma.voucher.aggregate({
          where: { deletedAt: null },
          _sum: { paidAmount: true, totalAmount: true },
        }),
        prisma.customer.count({ where: { deletedAt: null } }),
      ]);

      return Response.json({
        ok: true,
        totalVouchers,
        customersCount,
        totalRevenue: Number(revenue._sum.paidAmount || 0),
        totalInvoiced: Number(revenue._sum.totalAmount || 0),
        outstandingAmount: Number(outstanding._sum.remainingAmount || 0),
        outstandingCount: outstanding._count,
      });
    }

    default:
      return Response.json({
        error: "Unknown type",
        availableTypes: ["customers", "vouchers", "summary"],
      }, { status: 400 });
  }
}
