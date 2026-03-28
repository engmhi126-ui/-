"use client";
import { useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Building2, Bot, Save, CheckCircle } from "lucide-react";

interface Props {
  office: {
    officeName?: string; phone?: string | null; phone2?: string | null;
    email?: string | null; address?: string | null; city?: string | null;
  } | null;
  telegram: {
    botToken?: string; adminChatId?: string | null;
    notifyNewVoucher?: boolean; dailySummaryEnabled?: boolean;
    isActive?: boolean;
  } | null;
}

export function SettingsForm({ office, telegram }: Props) {
  const [officeForm, setOfficeForm] = useState({
    officeName: office?.officeName || "مكتب المطري للاستشارات الهندسية",
    phone: office?.phone || "+966538986031",
    phone2: office?.phone2 || "",
    email: office?.email || "engmhi126@gmail.com",
    address: office?.address || "جازان - العارضة - مجمع العبيدي - مقابل شاي فارس",
    city: office?.city || "جازان",
  });

  const [telegramForm, setTelegramForm] = useState({
    botToken: telegram?.botToken || "",
    adminChatId: telegram?.adminChatId || "",
    notifyNewVoucher: telegram?.notifyNewVoucher ?? true,
    dailySummaryEnabled: telegram?.dailySummaryEnabled ?? false,
    isActive: telegram?.isActive ?? false,
  });

  const [officeSaved, setOfficeSaved] = useState(false);
  const [telegramSaved, setTelegramSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const saveOffice = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "office", ...officeForm }),
      });
      setOfficeSaved(true);
      setTimeout(() => setOfficeSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const saveTelegram = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "telegram", ...telegramForm }),
      });
      setTelegramSaved(true);
      setTimeout(() => setTelegramSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Office settings */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <CardTitle>إعدادات المكتب</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <Input
            label="اسم المكتب"
            value={officeForm.officeName}
            onChange={(e) => setOfficeForm(p => ({ ...p, officeName: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="رقم الجوال" value={officeForm.phone} onChange={(e) => setOfficeForm(p => ({ ...p, phone: e.target.value }))} />
            <Input label="رقم جوال ثانٍ" value={officeForm.phone2} onChange={(e) => setOfficeForm(p => ({ ...p, phone2: e.target.value }))} />
          </div>
          <Input label="البريد الإلكتروني" type="email" value={officeForm.email} onChange={(e) => setOfficeForm(p => ({ ...p, email: e.target.value }))} />
          <Input label="العنوان" value={officeForm.address} onChange={(e) => setOfficeForm(p => ({ ...p, address: e.target.value }))} />
          <Input label="المدينة" value={officeForm.city} onChange={(e) => setOfficeForm(p => ({ ...p, city: e.target.value }))} />
          <Button onClick={saveOffice} loading={saving}>
            {officeSaved ? <><CheckCircle className="w-4 h-4" /> تم الحفظ</> : <><Save className="w-4 h-4" /> حفظ الإعدادات</>}
          </Button>
        </CardBody>
      </Card>

      {/* Telegram settings */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <Bot className="w-4 h-4 text-blue-600" />
          </div>
          <CardTitle>إعدادات بوت تيليجرام</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <Input
            label="Bot Token"
            value={telegramForm.botToken}
            onChange={(e) => setTelegramForm(p => ({ ...p, botToken: e.target.value }))}
            placeholder="123456:ABC..."
            type="password"
          />
          <Input
            label="Chat ID للإدارة"
            value={telegramForm.adminChatId}
            onChange={(e) => setTelegramForm(p => ({ ...p, adminChatId: e.target.value }))}
            placeholder="Chat ID رقم"
          />
          <div className="space-y-3">
            {[
              { key: "notifyNewVoucher", label: "إشعار عند إنشاء سند قبض جديد" },
              { key: "dailySummaryEnabled", label: "ملخص يومي تلقائي" },
              { key: "isActive", label: "تفعيل البوت" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={telegramForm[key as keyof typeof telegramForm] as boolean}
                  onChange={(e) => setTelegramForm(p => ({ ...p, [key]: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
              </label>
            ))}
          </div>

          {telegramForm.botToken && (
            <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-300">
              <p className="font-semibold mb-2">🔗 رابط إعداد الـ Webhook:</p>
              <code className="text-xs bg-slate-200 dark:bg-slate-600 px-2 py-1 rounded break-all">
                POST https://api.telegram.org/bot{telegramForm.botToken}/setWebhook?url={process.env.NEXT_PUBLIC_APP_URL || "https://your-domain.com"}/api/telegram/webhook
              </code>
            </div>
          )}

          <Button onClick={saveTelegram} loading={saving}>
            {telegramSaved ? <><CheckCircle className="w-4 h-4" /> تم الحفظ</> : <><Save className="w-4 h-4" /> حفظ إعدادات تيليجرام</>}
          </Button>
        </CardBody>
      </Card>

      {/* AI settings info */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
            <span className="text-purple-600 text-sm font-bold">AI</span>
          </div>
          <CardTitle>إعدادات الذكاء الاصطناعي</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-sm text-purple-800 dark:text-purple-200">
            <p className="font-semibold mb-2">لتفعيل Claude AI:</p>
            <p>أضف متغير البيئة <code className="bg-purple-100 dark:bg-purple-800 px-1.5 py-0.5 rounded text-xs">ANTHROPIC_API_KEY</code> في ملف <code className="bg-purple-100 dark:bg-purple-800 px-1.5 py-0.5 rounded text-xs">.env.local</code></p>
            <p className="mt-2 text-purple-600">بدون المفتاح، سيعمل المساعد بالمحرك القاعدي المدمج.</p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
