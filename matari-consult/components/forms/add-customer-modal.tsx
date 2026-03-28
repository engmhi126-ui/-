"use client";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export function AddCustomerModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", nationalId: "", district: "", city: "", email: "", notes: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "خطأ في الحفظ"); return; }
      setOpen(false);
      setForm({ name: "", phone: "", nationalId: "", district: "", city: "", email: "", notes: "" });
      router.refresh();
    } catch {
      setError("خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" />
        عميل جديد
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="إضافة عميل جديد" size="lg">
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="الاسم الكامل" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="اسم العميل" />
            <Input label="رقم الجوال" value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} required placeholder="05xxxxxxxx" />
            <Input label="رقم الهوية" value={form.nationalId} onChange={(e) => setForm(p => ({ ...p, nationalId: e.target.value }))} placeholder="رقم الهوية الوطنية" />
            <Input label="الحي" value={form.district} onChange={(e) => setForm(p => ({ ...p, district: e.target.value }))} placeholder="الحي" />
            <Input label="المدينة" value={form.city} onChange={(e) => setForm(p => ({ ...p, city: e.target.value }))} placeholder="المدينة" />
            <Input label="البريد الإلكتروني" type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} placeholder="example@email.com" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">ملاحظات</label>
            <textarea value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button type="submit" loading={loading}>حفظ العميل</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
