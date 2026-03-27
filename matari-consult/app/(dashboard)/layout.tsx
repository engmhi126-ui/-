import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { roleLabel } from "@/lib/utils";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar
        userName={session.name}
        userRole={roleLabel(session.role)}
      />
      {/* Main content - offset for sidebar */}
      <main className="lg:mr-60 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
