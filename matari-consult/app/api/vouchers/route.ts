import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { generateVoucherNumber } from "@/lib/voucher-number";
import { amountToArabicWords } from "@/lib/amount-to-words";
import { AuditAction } from "@/app/generated/prisma";
import { z } from "zod";

const voucherSchema = z.object({
  customerId: z.string().min(1, "العميل مطلوب"),
  date: z.string(),
  totalAmount: z.number().positive("المبلغ الإجمالي مطلوب"),
  paidAmount: z.number().min(0),
  paymentMethod: z.enum(["CASH", "NETWORK", "BANK_TRANSFER"]),
  bankName: z.string().optional(),
  chequeNumber: z.string().optional(),
  serviceType: z.enum(["CIVIL", "ARCHITECTURAL", "SURVEY", "OTHER"]),
  serviceOther: z.string().optional(),
  description: z.string().optional(),
  engineerId: z.string().min(1, "المهندس مطلوب"),
  accountantName: z.string().optional(),
  managementName: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["DRAFT", "ISSUED", "CANCELLED"]).default("ISSUED"),
});

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  const { searchParams } = new URL(request.url);

  const where: Record<string, unknown> = { deletedAt: null };

  // Engineers only see their vouchers
  if (session.role === "ENGINEER") {
    where.engineerId = session.userId;
  }

  const search = searchParams.get("search");
  if (search) {
    where.OR = [
      { voucherNumber: { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      { nationalId: { contains: search } },
      { engineerName: { contains: search, mode: "insensitive" } },
    ];
  }

  const engineerId = searchParams.get("engineerId");
  if (engineerId) where.engineerId = engineerId;

  const serviceType = searchParams.get("serviceType");
  if (serviceType) where.serviceType = serviceType;

  const paymentMethod = searchParams.get("paymentMethod");
  if (paymentMethod) where.paymentMethod = paymentMethod;

  const status = searchParams.get("status");
  if (status) where.status = status;

  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  if (startDate || endDate) {
    where.date = {};
    if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate);
    if (endDate) (where.date as Record<string, unknown>).lte = new Date(endDate + "T23:59:59");
  }

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

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

  return Response.json({
    vouchers,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

export async function POST(request: NextRequest) {
  const session = await requireAuth();

  try {
    const body = await request.json();
    const data = voucherSchema.parse(body);

    // Fetch customer and engineer details
    const [customer, engineer] = await Promise.all([
      prisma.customer.findUniqueOrThrow({ where: { id: data.customerId } }),
      prisma.user.findUniqueOrThrow({ where: { id: data.engineerId } }),
    ]);

    const remainingAmount = data.totalAmount - data.paidAmount;
    const voucherNumber = await generateVoucherNumber();

    const voucher = await prisma.voucher.create({
      data: {
        voucherNumber,
        date: new Date(data.date),
        customerId: data.customerId,
        customerName: customer.name,
        nationalId: customer.nationalId || undefined,
        phone: customer.phone,
        district: customer.district || undefined,
        totalAmount: data.totalAmount,
        paidAmount: data.paidAmount,
        remainingAmount,
        amountInWords: amountToArabicWords(data.paidAmount),
        paymentMethod: data.paymentMethod,
        bankName: data.bankName,
        chequeNumber: data.chequeNumber,
        serviceType: data.serviceType,
        serviceOther: data.serviceOther,
        description: data.description,
        engineerId: data.engineerId,
        engineerName: engineer.name,
        accountantName: data.accountantName,
        managementName: data.managementName,
        notes: data.notes,
        status: data.status,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: AuditAction.CREATE_VOUCHER,
        entityType: "voucher",
        entityId: voucher.id,
        details: { voucherNumber, customerName: customer.name },
      },
    });

    // Telegram notification
    void notifyTelegramNewVoucher(voucher.voucherNumber, customer.name, data.paidAmount);

    return Response.json(voucher, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "بيانات غير صحيحة", details: error.issues }, { status: 400 });
    }
    console.error(error);
    return Response.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

async function notifyTelegramNewVoucher(
  voucherNumber: string,
  customerName: string,
  amount: number
) {
  try {
    const settings = await prisma.telegramSettings.findFirst({
      where: { isActive: true, notifyNewVoucher: true },
    });
    if (!settings?.botToken || !settings?.adminChatId) return;

    const msg = `🧾 سند قبض جديد\nرقم: ${voucherNumber}\nالعميل: ${customerName}\nالمبلغ: ${amount.toLocaleString("ar-SA")} ريال`;
    await fetch(`https://api.telegram.org/bot${settings.botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: settings.adminChatId, text: msg }),
    });
  } catch {
    // Non-critical
  }
}
