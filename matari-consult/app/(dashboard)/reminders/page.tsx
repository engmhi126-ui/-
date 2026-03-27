import { requireAuth } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatCurrency, generateWhatsAppReminder } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ReminderCenter } from "@/components/reminders/reminder-center";

export default async function RemindersPage() {
  await requireAuth();

  const outstanding = await prisma.voucher.findMany({
    where: { deletedAt: null, status: "ISSUED", remainingAmount: { gt: 0 } },
    include: { customer: true, engineer: { select: { name: true } } },
    orderBy: { remainingAmount: "desc" },
  });

  const settings = await prisma.officeSettings.findFirst();
  const officeName = settings?.officeName || "مكتب المطري للاستشارات الهندسية";
  const officePhone = settings?.phone || "+966538986031";

  // Group by customer
  const customerMap = new Map<string, {
    customer: typeof outstanding[0]["customer"];
    totalRemaining: number;
    vouchers: typeof outstanding;
    message: string;
  }>();

  for (const v of outstanding) {
    if (!customerMap.has(v.customerId)) {
      customerMap.set(v.customerId, {
        customer: v.customer,
        totalRemaining: 0,
        vouchers: [],
        message: "",
      });
    }
    const entry = customerMap.get(v.customerId)!;
    entry.totalRemaining += Number(v.remainingAmount);
    entry.vouchers.push(v);
  }

  for (const [, entry] of customerMap) {
    entry.message = generateWhatsAppReminder(entry.customer.name, entry.totalRemaining, officeName, officePhone);
  }

  const reminderItems = Array.from(customerMap.values()).map((entry) => ({
    ...entry,
    voucherCount: entry.vouchers.length,
  }));
  const totalOutstanding = reminderItems.reduce((s: number, r) => s + r.totalRemaining, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="مركز التذكيرات"
        subtitle={`${reminderItems.length} عميل متبقي عليهم مبالغ`}
      />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardBody className="text-center py-6">
            <p className="text-3xl font-black text-red-600">{reminderItems.length}</p>
            <p className="text-sm text-slate-500 mt-1">عميل يحتاج تذكير</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center py-6">
            <p className="text-3xl font-black text-amber-600">{formatCurrency(totalOutstanding)}</p>
            <p className="text-sm text-slate-500 mt-1">إجمالي المبالغ المتبقية</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center py-6">
            <p className="text-3xl font-black text-blue-600">{outstanding.length}</p>
            <p className="text-sm text-slate-500 mt-1">سند غير مكتمل السداد</p>
          </CardBody>
        </Card>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <ReminderCenter reminderItems={reminderItems as any} />
    </div>
  );
}
