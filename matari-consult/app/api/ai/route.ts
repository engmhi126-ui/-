import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { AuditAction } from "@/app/generated/prisma";
import { serviceTypeLabel, paymentMethodLabel, formatCurrency } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const session = await requireAuth();

  const { query } = await request.json();
  if (!query) return Response.json({ error: "السؤال مطلوب" }, { status: 400 });

  // Build system context from database
  const context = await buildSystemContext();

  let response: string;

  // Check if Claude API key is available
  if (process.env.ANTHROPIC_API_KEY) {
    response = await askClaude(query, context);
  } else {
    // Built-in rule-based engine
    response = await ruleBasedEngine(query, context);
  }

  // Log query
  await prisma.aiQueryLog.create({
    data: {
      userId: session.userId,
      query,
      response,
      model: process.env.ANTHROPIC_API_KEY ? "claude-sonnet-4-6" : "rule-based",
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: AuditAction.AI_QUERY,
      details: { query: query.substring(0, 100) },
    },
  });

  return Response.json({ response });
}

async function buildSystemContext() {
  const [totalRevenue, outstanding, topCustomer, topService, topEngineer, weekRevenue] =
    await Promise.all([
      prisma.voucher.aggregate({
        where: { deletedAt: null, status: "ISSUED" },
        _sum: { paidAmount: true, remainingAmount: true },
        _count: true,
      }),
      prisma.voucher.findMany({
        where: {
          deletedAt: null,
          status: "ISSUED",
          remainingAmount: { gt: 0 },
        },
        include: { customer: { select: { name: true, phone: true } } },
        orderBy: { remainingAmount: "desc" },
        take: 10,
      }),
      prisma.voucher.groupBy({
        by: ["customerId", "customerName"],
        where: { deletedAt: null, status: "ISSUED" },
        _count: true,
        orderBy: { _count: { customerId: "desc" } },
        take: 1,
      }),
      prisma.voucher.groupBy({
        by: ["serviceType"],
        where: { deletedAt: null, status: "ISSUED" },
        _count: true,
        orderBy: { _count: { serviceType: "desc" } },
        take: 1,
      }),
      prisma.voucher.groupBy({
        by: ["engineerId", "engineerName"],
        where: { deletedAt: null, status: "ISSUED" },
        _count: true,
        orderBy: { _count: { engineerId: "desc" } },
        take: 1,
      }),
      prisma.voucher.aggregate({
        where: {
          deletedAt: null,
          status: "ISSUED",
          date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        _sum: { paidAmount: true },
        _count: true,
      }),
    ]);

  return {
    totalRevenue: Number(totalRevenue._sum.paidAmount || 0),
    totalOutstanding: Number(totalRevenue._sum.remainingAmount || 0),
    totalVouchers: totalRevenue._count,
    outstanding,
    topCustomer: topCustomer[0],
    topService: topService[0],
    topEngineer: topEngineer[0],
    weekRevenue: Number(weekRevenue._sum.paidAmount || 0),
    weekVouchers: weekRevenue._count,
  };
}

async function askClaude(query: string, context: Awaited<ReturnType<typeof buildSystemContext>>) {
  const systemPrompt = `أنت مساعد مالي ذكي لمكتب المطري للاستشارات الهندسية.
أجب على الأسئلة باللغة العربية فقط بناءً على البيانات التالية:

إجمالي الإيرادات المحصلة: ${formatCurrency(context.totalRevenue)}
إجمالي المبالغ المتبقية: ${formatCurrency(context.totalOutstanding)}
إجمالي السندات: ${context.totalVouchers}
إيرادات هذا الأسبوع: ${formatCurrency(context.weekRevenue)} (${context.weekVouchers} سند)
أكثر عميل: ${context.topCustomer?.customerName || "لا يوجد"}
أكثر خدمة: ${context.topService ? serviceTypeLabel(context.topService.serviceType) : "لا يوجد"}
أكثر مهندس: ${context.topEngineer?.engineerName || "لا يوجد"}

العملاء المتبقي عليهم مبالغ:
${context.outstanding.map((o) => `- ${o.customer.name}: ${formatCurrency(Number(o.remainingAmount))} (${o.customer.phone})`).join("\n")}

قدم إجابات واضحة ومفيدة ومختصرة.`;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: query }],
    }),
  });

  const data = await resp.json();
  return data.content?.[0]?.text || "عذراً، حدث خطأ في معالجة الطلب.";
}

async function ruleBasedEngine(
  query: string,
  context: Awaited<ReturnType<typeof buildSystemContext>>
) {
  const q = query.toLowerCase();

  if (q.includes("إجمالي") && (q.includes("إيراد") || q.includes("دخل") || q.includes("محصل"))) {
    return `إجمالي الإيرادات المحصلة: ${formatCurrency(context.totalRevenue)}\nإجمالي عدد السندات: ${context.totalVouchers}`;
  }

  if (q.includes("متبقي") || q.includes("مستحق") || q.includes("متأخر")) {
    if (context.outstanding.length === 0) {
      return "لا توجد مبالغ متبقية حالياً ✅";
    }
    const lines = context.outstanding
      .map((o) => `• ${o.customer.name}: ${formatCurrency(Number(o.remainingAmount))} | ${o.customer.phone}`)
      .join("\n");
    return `المبالغ المتبقية:\n${lines}\n\nالإجمالي: ${formatCurrency(context.totalOutstanding)}`;
  }

  if (q.includes("أسبوع") || q.includes("هذا الأسبوع")) {
    return `إيرادات هذا الأسبوع: ${formatCurrency(context.weekRevenue)}\nعدد السندات: ${context.weekVouchers}`;
  }

  if (q.includes("أكثر") && q.includes("عميل")) {
    return context.topCustomer
      ? `أكثر عميل تعاملاً: ${context.topCustomer.customerName} (${context.topCustomer._count} سند)`
      : "لا توجد بيانات كافية";
  }

  if (q.includes("أكثر") && q.includes("خدمة")) {
    return context.topService
      ? `أكثر خدمة: ${serviceTypeLabel(context.topService.serviceType)} (${context.topService._count} مرة)`
      : "لا توجد بيانات كافية";
  }

  if (q.includes("مهندس")) {
    return context.topEngineer
      ? `أكثر مهندس إصداراً للسندات: ${context.topEngineer.engineerName} (${context.topEngineer._count} سند)`
      : "لا توجد بيانات كافية";
  }

  if (q.includes("تقرير") || q.includes("ملخص")) {
    return `📊 ملخص الأداء المالي:
━━━━━━━━━━━━━━━━━
💰 إجمالي الإيرادات: ${formatCurrency(context.totalRevenue)}
📋 إجمالي السندات: ${context.totalVouchers}
⚠️ إجمالي المتبقيات: ${formatCurrency(context.totalOutstanding)}
📅 إيرادات الأسبوع: ${formatCurrency(context.weekRevenue)}
👥 أكثر عميل: ${context.topCustomer?.customerName || "—"}
🏆 أكثر مهندس: ${context.topEngineer?.engineerName || "—"}
🔧 أكثر خدمة: ${context.topService ? serviceTypeLabel(context.topService.serviceType) : "—"}`;
  }

  return `يمكنني مساعدتك في:
• إجمالي الإيرادات
• المبالغ المتبقية والمستحقة
• أكثر عميل أو خدمة أو مهندس
• إيرادات هذا الأسبوع
• ملخص الأداء المالي

اكتب سؤالك وسأجيب عليه فوراً.`;
}
