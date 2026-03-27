import { requireAuth } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatCurrency, roleLabel } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Table, Thead, Tbody, Th, Td, Tr, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { AddEngineerModal } from "@/components/forms/add-engineer-modal";
import { UserRole } from "@/app/generated/prisma";

export default async function EngineersPage() {
  const session = await requireAuth(UserRole.ADMIN);

  const engineers = await prisma.user.findMany({
    where: { role: { in: [UserRole.ENGINEER, UserRole.ADMIN, UserRole.SUPER_ADMIN] }, deletedAt: null },
    orderBy: { name: "asc" },
  });

  const enriched = await Promise.all(
    engineers.map(async (eng) => {
      const stats = await prisma.voucher.aggregate({
        where: { engineerId: eng.id, deletedAt: null, status: "ISSUED" },
        _sum: { paidAmount: true, remainingAmount: true },
        _count: true,
      });
      const customers = await prisma.voucher.groupBy({
        by: ["customerId"],
        where: { engineerId: eng.id, deletedAt: null, status: "ISSUED" },
      });
      return {
        ...eng,
        voucherCount: stats._count,
        totalCollected: Number(stats._sum.paidAmount || 0),
        totalOutstanding: Number(stats._sum.remainingAmount || 0),
        customerCount: customers.length,
      };
    })
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="المهندسون والموظفون"
        subtitle={`${engineers.length} مستخدم`}
        actions={<AddEngineerModal />}
      />

      <Table>
        <Thead>
          <tr>
            <Th>الاسم</Th>
            <Th>اسم المستخدم</Th>
            <Th>الدور</Th>
            <Th>السندات</Th>
            <Th>العملاء</Th>
            <Th>المحصل</Th>
            <Th>المتبقي</Th>
            <Th>الحالة</Th>
          </tr>
        </Thead>
        <Tbody>
          {enriched.length === 0 ? (
            <EmptyState message="لا يوجد مستخدمون" />
          ) : enriched.map((eng) => (
            <Tr key={eng.id}>
              <Td className="font-semibold">{eng.name}</Td>
              <Td className="text-slate-500 text-xs">{eng.username}</Td>
              <Td><Badge variant="info">{roleLabel(eng.role)}</Badge></Td>
              <Td><Badge variant="muted">{eng.voucherCount}</Badge></Td>
              <Td>{eng.customerCount}</Td>
              <Td className="text-emerald-600 font-medium">{formatCurrency(eng.totalCollected)}</Td>
              <Td className={eng.totalOutstanding > 0 ? "text-red-500 font-medium" : "text-slate-400"}>
                {formatCurrency(eng.totalOutstanding)}
              </Td>
              <Td>
                <Badge variant={eng.isActive ? "success" : "danger"}>
                  {eng.isActive ? "نشط" : "موقوف"}
                </Badge>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </div>
  );
}
