import { requireAuth } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate, serviceTypeLabel, paymentMethodLabel, voucherStatusLabel } from "@/lib/utils";
import { notFound } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, Thead, Tbody, Th, Td, Tr, EmptyState } from "@/components/ui/table";
import { StatCard } from "@/components/ui/stat-card";
import Link from "next/link";
import { ArrowRight, FileText, Phone, CreditCard, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerWhatsApp } from "@/components/forms/customer-whatsapp";

export default async function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id, deletedAt: null },
    include: {
      vouchers: {
        where: { deletedAt: null },
        orderBy: { date: "desc" },
        include: { engineer: { select: { name: true } } },
      },
    },
  });

  if (!customer) notFound();

  const settings = await prisma.officeSettings.findFirst();
  const officeName = settings?.officeName || "مكتب المطري للاستشارات الهندسية";
  const officePhone = settings?.phone || "+966538986031";

  type Voucher = typeof customer.vouchers[0];
  const issuedVouchers = customer.vouchers.filter((v: Voucher) => v.status === "ISSUED");
  const totalPaid = issuedVouchers.reduce((s: number, v: Voucher) => s + Number(v.paidAmount), 0);
  const totalRemaining = issuedVouchers.reduce((s: number, v: Voucher) => s + Number(v.remainingAmount), 0);
  const totalContract = issuedVouchers.reduce((s: number, v: Voucher) => s + Number(v.totalAmount), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.name}
        subtitle="كشف حساب العميل"
        actions={
          <div className="flex gap-2">
            <Link href="/customers">
              <Button variant="ghost" size="sm">
                <ArrowRight className="w-4 h-4" />
                رجوع
              </Button>
            </Link>
            {totalRemaining > 0 && (
              <CustomerWhatsApp
                customerName={customer.name}
                phone={customer.phone}
                remaining={totalRemaining}
                officeName={officeName}
                officePhone={officePhone}
              />
            )}
            <Link href={`/vouchers/new`}>
              <Button size="sm">
                <FileText className="w-4 h-4" />
                سند جديد
              </Button>
            </Link>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="إجمالي العقود" value={formatCurrency(totalContract)} icon={CreditCard} iconColor="text-blue-600" iconBg="bg-blue-50 dark:bg-blue-950" />
        <StatCard title="المدفوع" value={formatCurrency(totalPaid)} icon={CreditCard} iconColor="text-emerald-600" iconBg="bg-emerald-50 dark:bg-emerald-950" />
        <StatCard title="المتبقي" value={formatCurrency(totalRemaining)} icon={CreditCard} iconColor="text-red-500" iconBg="bg-red-50 dark:bg-red-950" />
        <StatCard title="السندات" value={issuedVouchers.length} icon={FileText} iconColor="text-purple-600" iconBg="bg-purple-50 dark:bg-purple-950" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer info */}
        <Card>
          <CardHeader><CardTitle>بيانات العميل</CardTitle></CardHeader>
          <CardBody className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600">رقم الجوال:</span>
              <span className="font-medium">{customer.phone}</span>
            </div>
            {customer.nationalId && (
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">رقم الهوية:</span>
                <span className="font-medium">{customer.nationalId}</span>
              </div>
            )}
            {customer.district && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">الحي:</span>
                <span className="font-medium">{customer.district}</span>
              </div>
            )}
            {customer.city && (
              <div>
                <span className="text-slate-600">المدينة: </span>
                <span className="font-medium">{customer.city}</span>
              </div>
            )}
            {customer.email && (
              <div>
                <span className="text-slate-600">البريد: </span>
                <span className="font-medium">{customer.email}</span>
              </div>
            )}
            {customer.notes && (
              <div className="pt-2 border-t border-slate-200">
                <p className="text-slate-500 text-xs">{customer.notes}</p>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200 text-xs text-slate-400">
              تاريخ التسجيل: {formatDate(customer.createdAt)}
            </div>
          </CardBody>
        </Card>

        {/* Balance summary */}
        <Card>
          <CardHeader><CardTitle>ملخص الحساب</CardTitle></CardHeader>
          <CardBody className="space-y-4">
            <div className="space-y-3">
              {[
                { label: "إجمالي العقود", value: totalContract, color: "text-slate-700" },
                { label: "المدفوع", value: totalPaid, color: "text-emerald-600" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-slate-500">{item.label}</span>
                  <span className={`font-semibold ${item.color}`}>{formatCurrency(item.value)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm border-t border-slate-200 pt-3">
                <span className="font-bold text-slate-700">المتبقي</span>
                <span className={`font-bold text-lg ${totalRemaining > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {formatCurrency(totalRemaining)}
                </span>
              </div>
            </div>
            {totalRemaining > 0 && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                  ⚠️ يوجد مبلغ متبقي غير مسدد
                </p>
              </div>
            )}
            {totalRemaining === 0 && issuedVouchers.length > 0 && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                  ✅ تم سداد جميع المستحقات
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Progress */}
        <Card>
          <CardHeader><CardTitle>نسبة السداد</CardTitle></CardHeader>
          <CardBody>
            {totalContract > 0 ? (
              <div className="space-y-4">
                <div className="text-center">
                  <span className="text-4xl font-black text-blue-600">
                    {Math.round((totalPaid / totalContract) * 100)}%
                  </span>
                  <p className="text-sm text-slate-500 mt-1">تم السداد</p>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-4">
                  <div
                    className="bg-blue-600 h-4 rounded-full transition-all"
                    style={{ width: `${Math.min((totalPaid / totalContract) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm text-center py-4">لا توجد بيانات</p>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Vouchers table */}
      <Card>
        <CardHeader>
          <CardTitle>سندات القبض ({customer.vouchers.length})</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <Table>
            <Thead>
              <tr>
                <Th>رقم السند</Th>
                <Th>التاريخ</Th>
                <Th>الخدمة</Th>
                <Th>الإجمالي</Th>
                <Th>المدفوع</Th>
                <Th>المتبقي</Th>
                <Th>المهندس</Th>
                <Th>الحالة</Th>
              </tr>
            </Thead>
            <Tbody>
              {customer.vouchers.length === 0 ? (
                <EmptyState message="لا توجد سندات لهذا العميل" />
              ) : customer.vouchers.map((v) => (
                <Tr key={v.id}>
                  <Td>
                    <Link href={`/vouchers/${v.id}`} className="text-blue-600 font-bold hover:underline">
                      {v.voucherNumber}
                    </Link>
                  </Td>
                  <Td className="text-xs text-slate-500">{formatDate(v.date)}</Td>
                  <Td><Badge variant="info">{serviceTypeLabel(v.serviceType)}</Badge></Td>
                  <Td>{formatCurrency(Number(v.totalAmount))}</Td>
                  <Td className="text-emerald-600 font-medium">{formatCurrency(Number(v.paidAmount))}</Td>
                  <Td className={Number(v.remainingAmount) > 0 ? "text-red-500 font-medium" : "text-slate-400"}>
                    {formatCurrency(Number(v.remainingAmount))}
                  </Td>
                  <Td>{v.engineer.name}</Td>
                  <Td>
                    <Badge variant={v.status === "ISSUED" ? "success" : v.status === "DRAFT" ? "warning" : "danger"}>
                      {voucherStatusLabel(v.status)}
                    </Badge>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
