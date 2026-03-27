import { requireAuth } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate, serviceTypeLabel, paymentMethodLabel, voucherStatusLabel } from "@/lib/utils";
import { Table, Thead, Tbody, Th, Td, Tr, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { VoucherFilters } from "@/components/voucher/voucher-filters";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { UserRole } from "@/app/generated/prisma";

interface Props {
  searchParams: Promise<{
    search?: string;
    engineerId?: string;
    serviceType?: string;
    paymentMethod?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
  }>;
}

export default async function VouchersPage({ searchParams }: Props) {
  const session = await requireAuth();
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const limit = 20;

  const where: Record<string, unknown> = { deletedAt: null };

  // Engineers see only their vouchers
  if (session.role === UserRole.ENGINEER) {
    where.engineerId = session.userId;
  }

  if (params.search) {
    where.OR = [
      { voucherNumber: { contains: params.search, mode: "insensitive" } },
      { customerName: { contains: params.search, mode: "insensitive" } },
      { phone: { contains: params.search } },
    ];
  }
  if (params.engineerId) where.engineerId = params.engineerId;
  if (params.serviceType) where.serviceType = params.serviceType;
  if (params.paymentMethod) where.paymentMethod = params.paymentMethod;
  if (params.status) where.status = params.status;
  if (params.startDate || params.endDate) {
    where.date = {};
    if (params.startDate) (where.date as Record<string, unknown>).gte = new Date(params.startDate);
    if (params.endDate) (where.date as Record<string, unknown>).lte = new Date(params.endDate + "T23:59:59");
  }

  const [vouchers, total, engineers] = await Promise.all([
    prisma.voucher.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        customer: { select: { name: true } },
        engineer: { select: { name: true } },
      },
    }),
    prisma.voucher.count({ where }),
    prisma.user.findMany({
      where: { role: { in: ["ENGINEER", "ADMIN"] }, deletedAt: null },
      select: { id: true, name: true },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <PageHeader
        title="سندات القبض"
        subtitle={`إجمالي ${total} سند`}
        actions={
          <Link href="/vouchers/new">
            <Button>
              <Plus className="w-4 h-4" />
              سند قبض جديد
            </Button>
          </Link>
        }
      />

      <VoucherFilters engineers={engineers} />

      <div>
        <Table>
          <Thead>
            <tr>
              <Th>رقم السند</Th>
              <Th>التاريخ</Th>
              <Th>العميل</Th>
              <Th>الخدمة</Th>
              <Th>المبلغ المدفوع</Th>
              <Th>المتبقي</Th>
              <Th>طريقة الدفع</Th>
              <Th>المهندس</Th>
              <Th>الحالة</Th>
              <Th></Th>
            </tr>
          </Thead>
          <Tbody>
            {vouchers.length === 0 ? (
              <EmptyState message="لا توجد سندات تطابق البحث" />
            ) : (
              vouchers.map((v) => (
                <Tr key={v.id}>
                  <Td>
                    <Link href={`/vouchers/${v.id}`} className="text-blue-600 font-bold hover:underline">
                      {v.voucherNumber}
                    </Link>
                  </Td>
                  <Td className="text-slate-500 text-xs">{formatDate(v.date)}</Td>
                  <Td className="font-medium">{v.customer.name}</Td>
                  <Td>
                    <Badge variant="info">{serviceTypeLabel(v.serviceType)}</Badge>
                  </Td>
                  <Td className="font-semibold text-emerald-600">{formatCurrency(Number(v.paidAmount))}</Td>
                  <Td className={Number(v.remainingAmount) > 0 ? "text-red-500 font-medium" : "text-slate-400"}>
                    {formatCurrency(Number(v.remainingAmount))}
                  </Td>
                  <Td>{paymentMethodLabel(v.paymentMethod)}</Td>
                  <Td>{v.engineer.name}</Td>
                  <Td>
                    <Badge variant={v.status === "ISSUED" ? "success" : v.status === "DRAFT" ? "warning" : "danger"}>
                      {voucherStatusLabel(v.status)}
                    </Badge>
                  </Td>
                  <Td>
                    <Link href={`/vouchers/${v.id}`} className="text-blue-600 text-xs hover:underline">
                      عرض
                    </Link>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
            <span>صفحة {page} من {totalPages} (إجمالي {total})</span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`/vouchers?page=${page - 1}`} className="px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-100">
                  السابق
                </Link>
              )}
              {page < totalPages && (
                <Link href={`/vouchers?page=${page + 1}`} className="px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-100">
                  التالي
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
