"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardBody, CardTitle } from "@/components/ui/card";
import { amountToArabicWords } from "@/lib/amount-to-words";
import { Save, Plus, User } from "lucide-react";

interface Engineer { id: string; name: string; }
interface Customer { id: string; name: string; phone: string; nationalId: string | null; district: string | null; }

interface Props {
  engineers: Engineer[];
  customers: Customer[];
  currentUserId: string;
  currentUserName: string;
}

export function VoucherForm({ engineers, customers, currentUserId, currentUserName }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);

  const [form, setForm] = useState({
    customerId: "",
    date: new Date().toISOString().split("T")[0],
    totalAmount: "",
    paidAmount: "",
    paymentMethod: "CASH",
    bankName: "",
    serviceType: "CIVIL",
    serviceOther: "",
    description: "",
    engineerId: currentUserId,
    accountantName: "",
    managementName: "",
    notes: "",
    status: "ISSUED",
  });

  const [newCustomer, setNewCustomer] = useState({
    name: "", phone: "", nationalId: "", district: "", city: "", email: "",
  });

  const selectedCustomer = customers.find((c) => c.id === form.customerId);
  const totalNum = parseFloat(form.totalAmount) || 0;
  const paidNum = parseFloat(form.paidAmount) || 0;
  const remainingNum = totalNum - paidNum;
  const amountWords = paidNum > 0 ? amountToArabicWords(paidNum) : "";

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSelectCustomer = (id: string) => {
    const c = customers.find((x) => x.id === id);
    setForm((prev) => ({ ...prev, customerId: id }));
    if (c) {
      // auto-fill from customer
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let customerId = form.customerId;

      // Create new customer if needed
      if (showNewCustomer) {
        const res = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newCustomer),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error || "خطأ في إضافة العميل");
          return;
        }
        const created = await res.json();
        customerId = created.id;
      }

      const res = await fetch("/api/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          customerId,
          totalAmount: totalNum,
          paidAmount: paidNum,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "حدث خطأ في الحفظ");
        return;
      }
      router.push(`/vouchers/${data.id}`);
    } catch {
      setError("خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 rounded-xl text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main voucher data */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>بيانات العميل</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowNewCustomer(!showNewCustomer)}
              >
                <Plus className="w-4 h-4" />
                {showNewCustomer ? "اختيار عميل موجود" : "عميل جديد"}
              </Button>
            </CardHeader>
            <CardBody className="space-y-4">
              {!showNewCustomer ? (
                <div className="space-y-3">
                  <Select
                    label="استلمنا من السيد / السادة"
                    id="customerId"
                    value={form.customerId}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    options={customers.map((c) => ({ value: c.id, label: `${c.name} - ${c.phone}` }))}
                    placeholder="اختر العميل..."
                    required
                  />
                  {selectedCustomer && (
                    <div className="grid grid-cols-3 gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                      <div><span className="text-slate-500">رقم الجوال:</span> <span className="font-medium">{selectedCustomer.phone}</span></div>
                      <div><span className="text-slate-500">رقم الهوية:</span> <span className="font-medium">{selectedCustomer.nationalId || "—"}</span></div>
                      <div><span className="text-slate-500">الحي:</span> <span className="font-medium">{selectedCustomer.district || "—"}</span></div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="الاسم الكامل" value={newCustomer.name} onChange={(e) => setNewCustomer(p => ({ ...p, name: e.target.value }))} required placeholder="اسم العميل" />
                  <Input label="رقم الجوال" value={newCustomer.phone} onChange={(e) => setNewCustomer(p => ({ ...p, phone: e.target.value }))} required placeholder="05xxxxxxxx" />
                  <Input label="رقم الهوية" value={newCustomer.nationalId} onChange={(e) => setNewCustomer(p => ({ ...p, nationalId: e.target.value }))} placeholder="رقم الهوية الوطنية" />
                  <Input label="الحي" value={newCustomer.district} onChange={(e) => setNewCustomer(p => ({ ...p, district: e.target.value }))} placeholder="اسم الحي" />
                  <Input label="المدينة" value={newCustomer.city} onChange={(e) => setNewCustomer(p => ({ ...p, city: e.target.value }))} placeholder="المدينة" />
                  <Input label="البريد الإلكتروني" type="email" value={newCustomer.email} onChange={(e) => setNewCustomer(p => ({ ...p, email: e.target.value }))} placeholder="البريد الإلكتروني" />
                </div>
              )}
            </CardBody>
          </Card>

          {/* Financial data */}
          <Card>
            <CardHeader><CardTitle>البيانات المالية</CardTitle></CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="المبلغ الإجمالي"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.totalAmount}
                  onChange={(e) => handleChange("totalAmount", e.target.value)}
                  placeholder="0.00"
                  required
                />
                <Input
                  label="المبلغ المدفوع"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.paidAmount}
                  onChange={(e) => handleChange("paidAmount", e.target.value)}
                  placeholder="0.00"
                  required
                />
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">المبلغ المتبقي</label>
                  <div className={`rounded-lg border px-3 py-2 text-sm font-semibold ${remainingNum > 0 ? "text-red-600 bg-red-50 border-red-200" : "text-emerald-600 bg-emerald-50 border-emerald-200"}`}>
                    {remainingNum.toFixed(2)} ر.س
                  </div>
                </div>
              </div>
              {amountWords && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <span className="font-bold">فقط لا غير: </span>{amountWords}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="طريقة الدفع"
                  value={form.paymentMethod}
                  onChange={(e) => handleChange("paymentMethod", e.target.value)}
                  options={[
                    { value: "CASH", label: "نقداً" },
                    { value: "NETWORK", label: "شبكة" },
                    { value: "BANK_TRANSFER", label: "تحويل على بنك" },
                  ]}
                />
                {form.paymentMethod === "BANK_TRANSFER" && (
                  <Input
                    label="اسم البنك"
                    value={form.bankName}
                    onChange={(e) => handleChange("bankName", e.target.value)}
                    placeholder="اسم البنك"
                  />
                )}
              </div>

              <Input
                label="وذلك قيمة (الوصف)"
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="وصف الخدمة المقدمة..."
              />
            </CardBody>
          </Card>

          {/* Service & engineer */}
          <Card>
            <CardHeader><CardTitle>نوع الخدمة والمسؤولون</CardTitle></CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="نوع الخدمة"
                  value={form.serviceType}
                  onChange={(e) => handleChange("serviceType", e.target.value)}
                  options={[
                    { value: "CIVIL", label: "هندسة مدنية" },
                    { value: "ARCHITECTURAL", label: "هندسة معمارية" },
                    { value: "SURVEY", label: "هندسة مساحة" },
                    { value: "OTHER", label: "أخرى" },
                  ]}
                />
                {form.serviceType === "OTHER" && (
                  <Input
                    label="تفاصيل الخدمة"
                    value={form.serviceOther}
                    onChange={(e) => handleChange("serviceOther", e.target.value)}
                    placeholder="حدد نوع الخدمة"
                  />
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select
                  label="المهندس"
                  value={form.engineerId}
                  onChange={(e) => handleChange("engineerId", e.target.value)}
                  options={engineers.map((e) => ({ value: e.id, label: e.name }))}
                  required
                />
                <Input
                  label="المحاسب"
                  value={form.accountantName}
                  onChange={(e) => handleChange("accountantName", e.target.value)}
                  placeholder="اسم المحاسب"
                />
                <Input
                  label="الإدارة"
                  value={form.managementName}
                  onChange={(e) => handleChange("managementName", e.target.value)}
                  placeholder="اسم الإدارة"
                />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>تفاصيل السند</CardTitle></CardHeader>
            <CardBody className="space-y-4">
              <Input
                label="التاريخ"
                type="date"
                value={form.date}
                onChange={(e) => handleChange("date", e.target.value)}
                required
              />
              <Select
                label="حالة السند"
                value={form.status}
                onChange={(e) => handleChange("status", e.target.value)}
                options={[
                  { value: "ISSUED", label: "صادر" },
                  { value: "DRAFT", label: "مسودة" },
                ]}
              />
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">ملاحظات</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  rows={4}
                  placeholder="أي ملاحظات إضافية..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </CardBody>
          </Card>

          {/* Summary preview */}
          {(totalNum > 0 || paidNum > 0) && (
            <Card>
              <CardHeader><CardTitle>ملخص السند</CardTitle></CardHeader>
              <CardBody className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">الإجمالي:</span>
                  <span className="font-semibold">{totalNum.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">المدفوع:</span>
                  <span className="font-semibold text-emerald-600">{paidNum.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span className="text-slate-500">المتبقي:</span>
                  <span className={`font-bold ${remainingNum > 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {remainingNum.toFixed(2)} ر.س
                  </span>
                </div>
              </CardBody>
            </Card>
          )}

          <Button type="submit" loading={loading} size="lg" className="w-full">
            <Save className="w-4 h-4" />
            حفظ السند
          </Button>
        </div>
      </div>
    </form>
  );
}
