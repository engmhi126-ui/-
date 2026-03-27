import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { serviceTypeLabel, paymentMethodLabel, formatCurrency } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = body?.message;
    if (!message?.text || !message?.chat?.id) {
      return Response.json({ ok: true });
    }

    const chatId = String(message.chat.id);
    const text = message.text.trim();

    const settings = await prisma.telegramSettings.findFirst({ where: { isActive: true } });
    if (!settings?.botToken) return Response.json({ ok: true });

    // Optional: restrict to admin only
    if (settings.adminChatId && chatId !== settings.adminChatId) {
      await sendMessage(settings.botToken, chatId, "⛔ غير مصرح لك باستخدام هذا البوت.");
      return Response.json({ ok: true });
    }

    let reply = "";

    if (text === "/start" || text === "/help") {
      reply = `مرحباً بك في بوت مكتب المطري 🏢

الأوامر المتاحة:
/summary - ملخص مالي شامل
/revenue - إجمالي الإيرادات
/outstanding - المبالغ المستحقة
/top_customers - أفضل العملاء
/top_services - أكثر الخدمات
/engineers - أداء المهندسين
/due_payments - العملاء المتأخرون
/week - إيرادات الأسبوع`;
    } else if (text === "/summary") {
      reply = await getSummary();
    } else if (text === "/revenue") {
      reply = await getRevenue();
    } else if (text === "/outstanding" || text === "/due_payments") {
      reply = await getOutstanding();
    } else if (text === "/top_customers") {
      reply = await getTopCustomers();
    } else if (text === "/top_services") {
      reply = await getTopServices();
    } else if (text === "/engineers") {
      reply = await getEngineers();
    } else if (text === "/week") {
      reply = await getWeekRevenue();
    } else {
      reply = "لم أفهم الأمر. أرسل /help لرؤية الأوامر المتاحة.";
    }

    await sendMessage(settings.botToken, chatId, reply);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return Response.json({ ok: true });
  }
}

async function sendMessage(token: string, chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

async function getSummary(): Promise<string> {
  const [revenue, outstanding, topEngineer, topService, weekRev] = await Promise.all([
    prisma.voucher.aggregate({ where: { deletedAt: null, status: "ISSUED" }, _sum: { paidAmount: true }, _count: true }),
    prisma.voucher.aggregate({ where: { deletedAt: null, status: "ISSUED", remainingAmount: { gt: 0 } }, _sum: { remainingAmount: true }, _count: true }),
    prisma.voucher.groupBy({ by: ["engineerName"], where: { deletedAt: null, status: "ISSUED" }, _count: true, orderBy: { _count: { engineerName: "desc" } }, take: 1 }),
    prisma.voucher.groupBy({ by: ["serviceType"], where: { deletedAt: null, status: "ISSUED" }, _count: true, orderBy: { _count: { serviceType: "desc" } }, take: 1 }),
    prisma.voucher.aggregate({ where: { deletedAt: null, status: "ISSUED", date: { gte: new Date(Date.now() - 7 * 86400000) } }, _sum: { paidAmount: true } }),
  ]);

  return `📊 <b>ملخص مكتب المطري</b>
━━━━━━━━━━━━━━━━━
💰 إجمالي الإيرادات: <b>${formatCurrency(Number(revenue._sum.paidAmount || 0))}</b>
📋 عدد السندات: <b>${revenue._count}</b>
⚠️ المتبقيات: <b>${formatCurrency(Number(outstanding._sum.remainingAmount || 0))}</b> (${outstanding._count} عميل)
📅 إيرادات الأسبوع: <b>${formatCurrency(Number(weekRev._sum.paidAmount || 0))}</b>
🏆 أفضل مهندس: <b>${topEngineer[0]?.engineerName || "—"}</b>
🔧 أكثر خدمة: <b>${topService[0] ? serviceTypeLabel(topService[0].serviceType) : "—"}</b>`;
}

async function getRevenue(): Promise<string> {
  const r = await prisma.voucher.aggregate({ where: { deletedAt: null, status: "ISSUED" }, _sum: { paidAmount: true }, _count: true });
  return `💰 إجمالي الإيرادات المحصلة:\n<b>${formatCurrency(Number(r._sum.paidAmount || 0))}</b>\nعدد السندات: ${r._count}`;
}

async function getOutstanding(): Promise<string> {
  const vouchers = await prisma.voucher.findMany({
    where: { deletedAt: null, status: "ISSUED", remainingAmount: { gt: 0 } },
    include: { customer: { select: { name: true, phone: true } } },
    orderBy: { remainingAmount: "desc" },
    take: 10,
  });

  if (!vouchers.length) return "✅ لا توجد مبالغ متبقية";

  const lines = vouchers.map(
    (v) => `• ${v.customer.name}: <b>${formatCurrency(Number(v.remainingAmount))}</b>`
  );

  const total = vouchers.reduce((s, v) => s + Number(v.remainingAmount), 0);
  return `⚠️ المبالغ المستحقة:\n${lines.join("\n")}\n\nالإجمالي: <b>${formatCurrency(total)}</b>`;
}

async function getTopCustomers(): Promise<string> {
  const data = await prisma.voucher.groupBy({
    by: ["customerName"],
    where: { deletedAt: null, status: "ISSUED" },
    _sum: { paidAmount: true },
    _count: true,
    orderBy: { _sum: { paidAmount: "desc" } },
    take: 5,
  });

  const lines = data.map(
    (d, i) => `${i + 1}. ${d.customerName}: ${formatCurrency(Number(d._sum.paidAmount || 0))} (${d._count} سند)`
  );
  return `👥 أفضل العملاء:\n${lines.join("\n")}`;
}

async function getTopServices(): Promise<string> {
  const data = await prisma.voucher.groupBy({
    by: ["serviceType"],
    where: { deletedAt: null, status: "ISSUED" },
    _count: true,
    _sum: { paidAmount: true },
    orderBy: { _count: { serviceType: "desc" } },
  });

  const lines = data.map(
    (d) => `• ${serviceTypeLabel(d.serviceType)}: ${d._count} مرة (${formatCurrency(Number(d._sum.paidAmount || 0))})`
  );
  return `🔧 تحليل الخدمات:\n${lines.join("\n")}`;
}

async function getEngineers(): Promise<string> {
  const data = await prisma.voucher.groupBy({
    by: ["engineerName"],
    where: { deletedAt: null, status: "ISSUED" },
    _count: true,
    _sum: { paidAmount: true },
    orderBy: { _sum: { paidAmount: "desc" } },
  });

  const lines = data.map(
    (d, i) => `${i + 1}. ${d.engineerName}: ${formatCurrency(Number(d._sum.paidAmount || 0))} (${d._count} سند)`
  );
  return `👷 أداء المهندسين:\n${lines.join("\n")}`;
}

async function getWeekRevenue(): Promise<string> {
  const r = await prisma.voucher.aggregate({
    where: { deletedAt: null, status: "ISSUED", date: { gte: new Date(Date.now() - 7 * 86400000) } },
    _sum: { paidAmount: true },
    _count: true,
  });
  return `📅 إيرادات آخر 7 أيام:\n<b>${formatCurrency(Number(r._sum.paidAmount || 0))}</b>\nعدد السندات: ${r._count}`;
}
