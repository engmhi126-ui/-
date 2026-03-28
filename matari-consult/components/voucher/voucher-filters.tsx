"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { useState } from "react";

interface Props {
  engineers: { id: string; name: string }[];
}

export function VoucherFilters({ engineers }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [search, setSearch] = useState(sp.get("search") || "");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    fd.forEach((v, k) => { if (v) params.set(k, String(v)); });
    router.push(`/vouchers?${params.toString()}`);
  };

  const handleClear = () => {
    setSearch("");
    router.push("/vouchers");
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <Input
          name="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث برقم السند أو العميل..."
          className="sm:col-span-2"
        />
        <Select
          name="serviceType"
          defaultValue={sp.get("serviceType") || ""}
          placeholder="نوع الخدمة"
          options={[
            { value: "CIVIL", label: "هندسة مدنية" },
            { value: "ARCHITECTURAL", label: "هندسة معمارية" },
            { value: "SURVEY", label: "هندسة مساحة" },
            { value: "OTHER", label: "أخرى" },
          ]}
        />
        <Select
          name="paymentMethod"
          defaultValue={sp.get("paymentMethod") || ""}
          placeholder="طريقة الدفع"
          options={[
            { value: "CASH", label: "نقداً" },
            { value: "NETWORK", label: "شبكة" },
            { value: "BANK_TRANSFER", label: "تحويل على بنك" },
          ]}
        />
        <Select
          name="status"
          defaultValue={sp.get("status") || ""}
          placeholder="الحالة"
          options={[
            { value: "ISSUED", label: "صادر" },
            { value: "DRAFT", label: "مسودة" },
            { value: "CANCELLED", label: "ملغي" },
          ]}
        />
        <Select
          name="engineerId"
          defaultValue={sp.get("engineerId") || ""}
          placeholder="المهندس"
          options={engineers.map((e) => ({ value: e.id, label: e.name }))}
        />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Input name="startDate" type="date" defaultValue={sp.get("startDate") || ""} className="max-w-[160px]" />
        <span className="text-slate-400 text-sm">إلى</span>
        <Input name="endDate" type="date" defaultValue={sp.get("endDate") || ""} className="max-w-[160px]" />
        <Button type="submit" size="sm">
          <Search className="w-4 h-4" />
          بحث
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
          <X className="w-4 h-4" />
          مسح
        </Button>
      </div>
    </form>
  );
}
