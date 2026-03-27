import { requireAuth } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Table, Thead, Tbody, Th, Td, Tr, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { AddCustomerModal } from "@/components/forms/add-customer-modal";

interface Props {
  searchParams: Promise<{ search?: string; page?: string }>;
}

export default async function CustomersPage({ searchParams }: Props) {
  await requireAuth();
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const limit = 20;

  const where: Record<string, unknown> = { deletedAt: null };
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { phone: { contains: params.search } },
      { nationalId: { contains: params.search } },
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        vouchers: {
          where: { deletedAt: null, status: "ISSUED" },
          select: { paidAmount: true, remainingAmount: true, totalAmount: true },
        },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  const enriched = customers.map((c) => ({
    ...c,
    totalPaid: c.vouchers.reduce((s: number, v: typeof c.vouchers[0]) => s + Number(v.paidAmount), 0),
    totalRemaining: c.vouchers.reduce((s: number, v: typeof c.vouchers[0]) => s + Number(v.remainingAmount), 0),
    totalContract: c.vouchers.reduce((s: number, v: typeof c.vouchers[0]) => s + Number(v.totalAmount), 0),
    voucherCount: c.vouchers.length,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="العملاء"
        subtitle={`إجمالي ${total} عميل`}
        actions={<AddCustomerModal />}
      />

      {/* Search */}
      <form className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            name="search"
            defaultValue={params.search || ""}
            placeholder="ابحث بالاسم أو الجوال أو الهوية..."
            className="w-full pr-9 pl-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <Button type="submit" size="sm">بحث</Button>
      </form>

      <Table>
        <Thead>
          <tr>
            <Th>العميل</Th>
            <Th>رقم الجوال</Th>
            <Th>رقم الهوية</Th>
            <Th>الحي</Th>
            <Th>السندات</Th>
            <Th>إجمالي العقود</Th>
            <Th>المدفوع</Th>
            <Th>المتبقي</Th>
            <Th></Th>
          </tr>
        </Thead>
        <Tbody>
          {enriched.length === 0 ? (
            <EmptyState message="لا يوجد عملاء" />
          ) : enriched.map((c) => (
            <Tr key={c.id}>
              <Td>
                <Link href={`/customers/${c.id}`} className="font-semibold text-blue-600 hover:underline">
                  {c.name}
                </Link>
              </Td>
              <Td>{c.phone}</Td>
              <Td>{c.nationalId || "—"}</Td>
              <Td>{c.district || "—"}</Td>
              <Td>
                <Badge variant="muted">{c.voucherCount}</Badge>
              </Td>
              <Td>{formatCurrency(c.totalContract)}</Td>
              <Td className="text-emerald-600 font-medium">{formatCurrency(c.totalPaid)}</Td>
              <Td>
                {c.totalRemaining > 0 ? (
                  <span className="text-red-500 font-semibold">{formatCurrency(c.totalRemaining)}</span>
                ) : (
                  <Badge variant="success">مسدد</Badge>
                )}
              </Td>
              <Td>
                <Link href={`/customers/${c.id}`} className="text-blue-600 text-xs hover:underline">
                  كشف حساب
                </Link>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </div>
  );
}
