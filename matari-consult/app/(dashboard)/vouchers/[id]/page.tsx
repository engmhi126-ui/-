import { requireAuth } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate, serviceTypeLabel, paymentMethodLabel, voucherStatusLabel } from "@/lib/utils";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Printer, ArrowRight, Edit, MessageCircle } from "lucide-react";
import { UserRole } from "@/app/generated/prisma";
import { VoucherActions } from "@/components/voucher/voucher-actions";

export default async function VoucherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  const { id } = await params;

  const voucher = await prisma.voucher.findUnique({
    where: { id, deletedAt: null },
    include: {
      customer: true,
      engineer: { select: { name: true, phone: true } },
      reminders: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { sentBy: { select: { name: true } } },
      },
    },
  });

  if (!voucher) notFound();

  // Engineers can only see their vouchers
  if (session.role === UserRole.ENGINEER && voucher.engineerId !== session.userId) {
    notFound();
  }

  const settings = await prisma.officeSettings.findFirst();
  const officeName = settings?.officeName || "مكتب المطري للاستشارات الهندسية";
  const officePhone = settings?.phone || "+966538986031";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`سند قبض: ${voucher.voucherNumber}`}
        subtitle={formatDate(voucher.date)}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/vouchers">
              <Button variant="ghost" size="sm">
                <ArrowRight className="w-4 h-4" />
                رجوع
              </Button>
            </Link>
            <Link href={`/vouchers/${id}/print`} target="_blank">
              <Button variant="outline" size="sm">
                <Printer className="w-4 h-4" />
                طباعة
              </Button>
            </Link>
            <VoucherActions voucher={voucher} officeName={officeName} officePhone={officePhone} />
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Voucher preview */}
          <Card>
            <CardBody className="p-8">
              {/* Office header */}
              <div className="flex justify-between items-start border-b-2 border-blue-700 pb-4 mb-6">
                <div className="text-right">
                  <h2 className="text-xl font-black text-slate-800">{officeName}</h2>
                  <p className="text-sm text-slate-500">هندسة مدنية • معمارية • مساحة</p>
                  <p className="text-xs text-slate-400 mt-1">{settings?.phone}</p>
                  <p className="text-xs text-slate-400">{settings?.email}</p>
                </div>
                <div className="text-center">
                  <div className="bg-blue-700 text-white px-6 py-3 rounded-xl font-black text-2xl shadow-lg">
                    سند قبض
                  </div>
                  <div className="mt-1 text-xs text-slate-500">Payment Voucher</div>
                </div>
                <div className="text-left text-sm">
                  <div className="space-y-1">
                    <div className="flex gap-2 items-center">
                      <span className="text-slate-500 text-xs">رقم:</span>
                      <span className="font-bold text-blue-700">{voucher.voucherNumber}</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="text-slate-500 text-xs">التاريخ:</span>
                      <span className="font-medium">{formatDate(voucher.date)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial summary boxes */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { label: "الإجمالي", value: formatCurrency(Number(voucher.totalAmount)), color: "bg-slate-50" },
                  { label: "المدفوع", value: formatCurrency(Number(voucher.paidAmount)), color: "bg-emerald-50" },
                  { label: "المتبقي", value: formatCurrency(Number(voucher.remainingAmount)), color: Number(voucher.remainingAmount) > 0 ? "bg-red-50" : "bg-emerald-50" },
                ].map((item) => (
                  <div key={item.label} className={`${item.color} rounded-lg p-3 text-center border border-slate-200`}>
                    <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                    <p className="font-bold text-slate-800 text-sm">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Main fields */}
              <div className="space-y-3">
                <FieldRow label="استلمنا من السيد / السادة" value={voucher.customerName} />
                {voucher.nationalId && <FieldRow label="رقم الهوية" value={voucher.nationalId} />}
                <div className="grid grid-cols-2 gap-3">
                  <FieldRow label="رقم الجوال" value={voucher.phone} />
                  {voucher.district && <FieldRow label="الحي" value={voucher.district} />}
                </div>
                <div className="flex items-center gap-2 border-b border-dashed border-slate-300 pb-3">
                  <span className="text-sm font-bold text-slate-700 min-w-[100px]">مبلغ وقدرة:</span>
                  <span className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-semibold text-slate-800">
                    {formatCurrency(Number(voucher.paidAmount))}
                  </span>
                </div>
                {voucher.amountInWords && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
                    <span className="font-bold">فقط لا غير: </span>{voucher.amountInWords}
                  </div>
                )}

                {/* Payment method */}
                <div className="flex items-center gap-6 py-2">
                  <span className="text-sm font-medium text-slate-600">طريقة الدفع:</span>
                  {["CASH", "NETWORK", "BANK_TRANSFER"].map((m) => (
                    <label key={m} className="flex items-center gap-2 text-sm">
                      <div className={`w-4 h-4 rounded-full border-2 ${voucher.paymentMethod === m ? "bg-blue-600 border-blue-600" : "border-slate-300"}`} />
                      {paymentMethodLabel(m)}
                    </label>
                  ))}
                  {voucher.bankName && <span className="text-sm text-slate-500">({voucher.bankName})</span>}
                </div>

                {voucher.description && <FieldRow label="وذلك قيمة" value={voucher.description} />}

                {/* Service type */}
                <div className="flex items-center gap-6 py-2">
                  <span className="text-sm font-medium text-slate-600">نوع الخدمة:</span>
                  {["CIVIL", "ARCHITECTURAL", "SURVEY", "OTHER"].map((s) => (
                    <label key={s} className="flex items-center gap-2 text-sm">
                      <div className={`w-4 h-4 rounded-sm border-2 ${voucher.serviceType === s ? "bg-blue-600 border-blue-600" : "border-slate-300"}`} />
                      {serviceTypeLabel(s)}
                    </label>
                  ))}
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200">
                  <div className="text-center">
                    <p className="text-xs text-slate-500 mb-6">المهندس</p>
                    <p className="font-medium text-sm border-t border-slate-300 pt-1">{voucher.engineerName}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500 mb-6">المحاسب</p>
                    <p className="font-medium text-sm border-t border-slate-300 pt-1">{voucher.accountantName || "—"}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500 mb-6">توقيع المستلم</p>
                    <p className="text-sm border-t border-slate-300 pt-1 text-slate-300">........................</p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Info sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>معلومات السند</CardTitle></CardHeader>
            <CardBody className="space-y-3 text-sm">
              <InfoRow label="الحالة">
                <Badge variant={voucher.status === "ISSUED" ? "success" : voucher.status === "DRAFT" ? "warning" : "danger"}>
                  {voucherStatusLabel(voucher.status)}
                </Badge>
              </InfoRow>
              <InfoRow label="المهندس" value={voucher.engineerName} />
              <InfoRow label="الخدمة" value={serviceTypeLabel(voucher.serviceType)} />
              <InfoRow label="تاريخ الإنشاء" value={formatDate(voucher.createdAt)} />
              {voucher.notes && <InfoRow label="ملاحظات" value={voucher.notes} />}
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>معلومات العميل</CardTitle></CardHeader>
            <CardBody className="space-y-2 text-sm">
              <Link href={`/customers/${voucher.customerId}`} className="font-semibold text-blue-600 hover:underline">
                {voucher.customer.name}
              </Link>
              <InfoRow label="الجوال" value={voucher.phone} />
              {voucher.nationalId && <InfoRow label="الهوية" value={voucher.nationalId} />}
              {voucher.district && <InfoRow label="الحي" value={voucher.district} />}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-dashed border-slate-200 pb-2">
      <span className="text-sm font-bold text-slate-600 min-w-[130px] flex-shrink-0">{label}:</span>
      <span className="flex-1 text-slate-800 font-medium">{value}</span>
    </div>
  );
}

function InfoRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}:</span>
      {children || <span className="font-medium text-slate-700 dark:text-slate-300">{value}</span>}
    </div>
  );
}
