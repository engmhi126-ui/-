import { requireAuth } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { VoucherForm } from "@/components/voucher/voucher-form";
import { UserRole } from "@/app/generated/prisma";

export default async function NewVoucherPage() {
  const session = await requireAuth();

  const [engineers, customers] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: [UserRole.ENGINEER, UserRole.ADMIN] }, deletedAt: null, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.customer.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true, phone: true, nationalId: true, district: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="إنشاء سند قبض جديد"
        subtitle="أدخل بيانات سند القبض"
      />
      <VoucherForm
        engineers={engineers}
        customers={customers}
        currentUserId={session.userId}
        currentUserName={session.name}
      />
    </div>
  );
}
