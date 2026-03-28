"use client";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export function AddEngineerModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", username: "", password: "", email: "", phone: "", role: "ENGINEER" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/engineers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "خطأ في الحفظ"); return; }
      setOpen(false);
      setForm({ name: "", username: "", password: "", email: "", phone: "", role: "ENGINEER" });
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
        مستخدم جديد
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="إضافة مستخدم جديد" size="md">
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="الاسم الكامل" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="اسم المستخدم" value={form.username} onChange={(e) => setForm(p => ({ ...p, username: e.target.value }))} required />
            <Input label="كلمة المرور" type="password" value={form.password} onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="الجوال" value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} />
            <Input label="البريد" type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
          </div>
          <Select
            label="الدور"
            value={form.role}
            onChange={(e) => setForm(p => ({ ...p, role: e.target.value }))}
            options={[
              { value: "ENGINEER", label: "مهندس" },
              { value: "ADMIN", label: "مدير / محاسب" },
              { value: "VIEWER", label: "مشاهد فقط" },
            ]}
          />
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button type="submit" loading={loading}>حفظ</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
