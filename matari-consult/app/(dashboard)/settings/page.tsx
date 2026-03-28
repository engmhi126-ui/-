import { requireAuth } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { UserRole } from "@/app/generated/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsForm } from "@/components/forms/settings-form";

export default async function SettingsPage() {
  await requireAuth(UserRole.ADMIN);

  const [office, telegram] = await Promise.all([
    prisma.officeSettings.findFirst(),
    prisma.telegramSettings.findFirst(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="الإعدادات" subtitle="إعدادات المكتب وتكاملات البوت والذكاء الاصطناعي" />
      <SettingsForm office={office} telegram={telegram} />
    </div>
  );
}
