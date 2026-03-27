/**
 * n8n Inbound Webhook
 * n8n يستدعي هذا المسار لتشغيل إجراءات في النظام
 *
 * مثال على استخدامه من n8n:
 * POST /api/n8n/webhook
 * Headers: { "X-N8N-API-Key": "<your-key>" }
 * Body: { "action": "send_reminders" }
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { formatCurrency, generateWhatsAppReminder } from "@/lib/utils";

function verifyApiKey(request: NextRequest): boolean {
  const apiKey = process.env.N8N_API_KEY;
  if (!apiKey) return true; // No key configured — open (dev mode)
  const incoming = request.headers.get("X-N8N-API-Key") || request.headers.get("x-n8n-api-key");
  return incoming === apiKey;
}

export async function POST(request: NextRequest) {
  if (!verifyApiKey(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { action?: string; [key: string]: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action } = body;

  switch (action) {

    // ──────────────────────────────────────────────
    // إرسال قائمة العملاء المتأخرين عن السداد
    // ──────────────────────────────────────────────
    case "get_outstanding": {
      const vouchers = await prisma.voucher.findMany({
        where: { deletedAt: null, status: "ISSUED", remainingAmount: { gt: 0 } },
        include: { customer: true },
        orderBy: { remainingAmount: "desc" },
      });

      const settings = await prisma.officeSettings.findFirst();
      const officeName = settings?.officeName || "مكتب المطري للاستشارات الهندسية";
      const officePhone = settings?.phone || "";

      const grouped = new Map<string, { name: string; phone: string; total: number; message: string }>();
      for (const v of vouchers) {
        if (!grouped.has(v.customerId)) {
          grouped.set(v.customerId, { name: v.customer.name, phone: v.customer.phone, total: 0, message: "" });
        }
        grouped.get(v.customerId)!.total += Number(v.remainingAmount);
      }
      for (const [, entry] of grouped) {
        entry.message = generateWhatsAppReminder(entry.name, entry.total, officeName, officePhone);
      }

      return Response.json({
        ok: true,
        count: grouped.size,
        customers: Array.from(grouped.values()),
      });
    }

    // ──────────────────────────────────────────────
    // ملخص يومي
    // ──────────────────────────────────────────────
    case "daily_summary": {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [todayVouchers, totalOutstanding, totalRevenue] = await Promise.all([
        prisma.voucher.findMany({
          where: { deletedAt: null, date: { gte: today, lt: tomorrow } },
          select: { voucherNumber: true, customerName: true, paidAmount: true, totalAmount: true },
        }),
        prisma.voucher.aggregate({
          where: { deletedAt: null, status: "ISSUED", remainingAmount: { gt: 0 } },
          _sum: { remainingAmount: true },
        }),
        prisma.voucher.aggregate({
          where: { deletedAt: null },
          _sum: { paidAmount: true },
        }),
      ]);

      return Response.json({
        ok: true,
        date: today.toLocaleDateString("ar-SA"),
        todayVouchersCount: todayVouchers.length,
        todayCollected: todayVouchers.reduce((s, v) => s + Number(v.paidAmount), 0),
        totalOutstanding: Number(totalOutstanding._sum.remainingAmount || 0),
        totalRevenue: Number(totalRevenue._sum.paidAmount || 0),
        todayVouchers,
      });
    }

    // ──────────────────────────────────────────────
    // ملخص أسبوعي
    // ──────────────────────────────────────────────
    case "weekly_summary": {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);

      const vouchers = await prisma.voucher.findMany({
        where: { deletedAt: null, date: { gte: weekAgo } },
        select: { paidAmount: true, remainingAmount: true, serviceType: true, engineerName: true },
      });

      const totalCollected = vouchers.reduce((s, v) => s + Number(v.paidAmount), 0);
      const totalOutstanding = vouchers.reduce((s, v) => s + Number(v.remainingAmount), 0);

      return Response.json({
        ok: true,
        period: "آخر 7 أيام",
        count: vouchers.length,
        totalCollected,
        totalOutstanding,
        formattedCollected: formatCurrency(totalCollected),
        formattedOutstanding: formatCurrency(totalOutstanding),
      });
    }

    default:
      return Response.json({
        error: "Unknown action",
        availableActions: ["get_outstanding", "daily_summary", "weekly_summary"],
      }, { status: 400 });
  }
}
