import { requireAuth } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatCurrency, serviceTypeLabel, paymentMethodLabel } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportsClient } from "@/components/dashboard/reports-client";

export default async function ReportsPage() {
  await requireAuth();

  const [byService, byPayment, byEngineer, totalStats] = await Promise.all([
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
    prisma.voucher.groupBy({
      by: ["engineerName"],
      where: { deletedAt: null, status: "ISSUED" },
      _sum: { paidAmount: true, remainingAmount: true },
      _count: true,
      orderBy: { _sum: { paidAmount: "desc" } },
    }),
    prisma.voucher.aggregate({
      where: { deletedAt: null, status: "ISSUED" },
      _sum: { paidAmount: true, remainingAmount: true, totalAmount: true },
      _count: true,
    }),
  ]);

  const engineers = await prisma.user.findMany({
    where: { role: { in: ["ENGINEER", "ADMIN"] }, deletedAt: null },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="التقارير المالية" subtitle="تحليل شامل للأداء المالي للمكتب" />

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "إجمالي الإيرادات", value: formatCurrency(Number(totalStats._sum.paidAmount || 0)), color: "bg-blue-50 text-blue-700" },
          { label: "إجمالي العقود", value: formatCurrency(Number(totalStats._sum.totalAmount || 0)), color: "bg-purple-50 text-purple-700" },
          { label: "إجمالي المتبقيات", value: formatCurrency(Number(totalStats._sum.remainingAmount || 0)), color: "bg-red-50 text-red-700" },
          { label: "عدد السندات", value: totalStats._count.toString(), color: "bg-emerald-50 text-emerald-700" },
        ].map((s) => (
          <div key={s.label} className={`${s.color} rounded-xl p-5 border border-current/10`}>
            <p className="text-sm opacity-70 mb-1">{s.label}</p>
            <p className="text-2xl font-black">{s.value}</p>
          </div>
        ))}
      </div>

      <ReportsClient
        byService={byService.map((s) => ({ name: serviceTypeLabel(s.serviceType), total: Number(s._sum.paidAmount || 0), count: s._count }))}
        byPayment={byPayment.map((p) => ({ name: paymentMethodLabel(p.paymentMethod), total: Number(p._sum.paidAmount || 0), count: p._count }))}
        byEngineer={byEngineer.map((e) => ({ name: e.engineerName, total: Number(e._sum.paidAmount || 0), outstanding: Number(e._sum.remainingAmount || 0), count: e._count }))}
        engineers={engineers}
      />
    </div>
  );
}
