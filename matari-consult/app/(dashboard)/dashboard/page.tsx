import { requireAuth } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate, serviceTypeLabel, paymentMethodLabel, voucherStatusLabel } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardBody, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, Thead, Tbody, Th, Td, Tr, EmptyState } from "@/components/ui/table";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import {
  FileText, Users, TrendingUp, AlertCircle, HardHat, CheckCircle
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
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

  // Monthly revenue (last 6 months)
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

  const serviceChartData = byService.map((s) => ({
    name: serviceTypeLabel(s.serviceType),
    value: Number(s._sum.paidAmount || 0),
    count: s._count,
  }));

  const paymentChartData = byPayment.map((p) => ({
    name: paymentMethodLabel(p.paymentMethod),
    value: Number(p._sum.paidAmount || 0),
    count: p._count,
  }));

  const monthlyData = monthlyRevenue.map((m) => ({
    month: m.month,
    total: m.total,
    count: m.count,
  }));

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">لوحة الإدارة</h1>
        <p className="text-slate-500 text-sm mt-0.5">مرحباً بك في نظام مكتب المطري للمحاسبة</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي الإيرادات"
          value={formatCurrency(Number(totalRevenue._sum.paidAmount || 0))}
          subtitle={`${totalVouchers} سند قبض`}
          icon={TrendingUp}
          iconColor="text-blue-600"
          iconBg="bg-blue-50 dark:bg-blue-950"
        />
        <StatCard
          title="إجمالي العملاء"
          value={totalCustomers}
          subtitle="عميل مسجل"
          icon={Users}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50 dark:bg-emerald-950"
        />
        <StatCard
          title="سندات القبض"
          value={totalVouchers}
          subtitle="إجمالي السندات الصادرة"
          icon={FileText}
          iconColor="text-purple-600"
          iconBg="bg-purple-50 dark:bg-purple-950"
        />
        <StatCard
          title="المبالغ المتبقية"
          value={formatCurrency(Number(outstanding._sum.remainingAmount || 0))}
          subtitle={`${outstanding._count} عميل متأخر`}
          icon={AlertCircle}
          iconColor="text-red-500"
          iconBg="bg-red-50 dark:bg-red-950"
        />
      </div>

      {/* Charts */}
      <DashboardCharts
        serviceData={serviceChartData}
        paymentData={paymentChartData}
        monthlyData={monthlyData}
      />

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent vouchers */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>آخر السندات</CardTitle>
              <Link href="/vouchers" className="text-blue-600 text-sm hover:underline">عرض الكل</Link>
            </CardHeader>
            <CardBody className="p-0">
              <Table>
                <Thead>
                  <tr>
                    <Th>رقم السند</Th>
                    <Th>العميل</Th>
                    <Th>المبلغ</Th>
                    <Th>الحالة</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {recentVouchers.length === 0 ? (
                    <EmptyState message="لا توجد سندات بعد" />
                  ) : (
                    recentVouchers.map((v) => (
                      <Tr key={v.id} onClick={() => {}}>
                        <Td>
                          <Link href={`/vouchers/${v.id}`} className="text-blue-600 font-medium hover:underline">
                            {v.voucherNumber}
                          </Link>
                        </Td>
                        <Td>{v.customer.name}</Td>
                        <Td className="font-medium">{formatCurrency(Number(v.paidAmount))}</Td>
                        <Td>
                          <Badge variant={v.status === "ISSUED" ? "success" : v.status === "DRAFT" ? "warning" : "danger"}>
                            {voucherStatusLabel(v.status)}
                          </Badge>
                        </Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </CardBody>
          </Card>
        </div>

        {/* Top customers + engineers */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>أفضل العملاء</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              {topCustomers.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">لا توجد بيانات</p>
              ) : topCustomers.map((c, i) => (
                <div key={c.customerId} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{c.customerName}</p>
                    <p className="text-xs text-slate-400">{c._count} سند</p>
                  </div>
                  <span className="text-sm font-semibold text-blue-600">
                    {formatCurrency(Number(c._sum.paidAmount || 0))}
                  </span>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>أداء المهندسين</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              {topEngineers.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">لا توجد بيانات</p>
              ) : topEngineers.map((e, i) => (
                <div key={e.engineerId} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{e.engineerName}</p>
                    <p className="text-xs text-slate-400">{e._count} سند</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">
                    {formatCurrency(Number(e._sum.paidAmount || 0))}
                  </span>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
