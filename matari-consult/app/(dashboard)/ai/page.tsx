import { requireAuth } from "@/lib/dal";
import { AiChat } from "@/components/ai/ai-chat";
import { PageHeader } from "@/components/layout/page-header";

export default async function AiPage() {
  await requireAuth();
  return (
    <div className="space-y-6">
      <PageHeader
        title="المساعد الذكي"
        subtitle="اسأل عن أي معلومة مالية أو إحصائية في نظام المكتب"
      />
      <AiChat />
    </div>
  );
}
