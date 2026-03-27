"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { MessageCircle, Copy, Send, CheckCircle, Bell } from "lucide-react";
import Link from "next/link";

interface ReminderItem {
  customer: { id: string; name: string; phone: string };
  totalRemaining: number;
  voucherCount: number;
  message: string;
  vouchers: Array<{ id: string; voucherNumber: string; remainingAmount: string | number }>;
}

interface Props {
  reminderItems: ReminderItem[];
}

export function ReminderCenter({ reminderItems }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === reminderItems.length) setSelected(new Set());
    else setSelected(new Set(reminderItems.map((r) => r.customer.id)));
  };

  const openWhatsApp = (item: ReminderItem) => {
    const cleaned = item.customer.phone.replace(/\D/g, "");
    const num = cleaned.startsWith("966") ? cleaned : cleaned.startsWith("0") ? `966${cleaned.slice(1)}` : `966${cleaned}`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(item.message)}`, "_blank");
    setSentMap((p) => ({ ...p, [item.customer.id]: true }));
  };

  const copyMessage = async (id: string, message: string) => {
    await navigator.clipboard.writeText(message);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const markAllSent = async () => {
    if (selected.size === 0) return;
    setSending(true);
    try {
      const items = reminderItems
        .filter((r) => selected.has(r.customer.id))
        .map((r) => ({
          customerId: r.customer.id,
          channel: "whatsapp",
          message: r.message,
        }));

      await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(items),
      });

      const newSent: Record<string, boolean> = { ...sentMap };
      for (const id of selected) newSent[id] = true;
      setSentMap(newSent);
      setSelected(new Set());
    } finally {
      setSending(false);
    }
  };

  if (reminderItems.length === 0) {
    return (
      <Card>
        <CardBody className="text-center py-16">
          <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">لا توجد مبالغ متبقية</h3>
          <p className="text-slate-400">جميع العملاء قاموا بسداد مستحقاتهم ✅</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="outline" size="sm" onClick={selectAll}>
          {selected.size === reminderItems.length ? "إلغاء الكل" : "تحديد الكل"}
        </Button>
        {selected.size > 0 && (
          <>
            <span className="text-sm text-slate-500">{selected.size} محدد</span>
            <Button size="sm" loading={sending} onClick={markAllSent}>
              <Bell className="w-4 h-4" />
              تسجيل الإرسال ({selected.size})
            </Button>
          </>
        )}
      </div>

      {/* Reminder cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {reminderItems.map((item) => (
          <Card key={item.customer.id} className={`transition-all ${selected.has(item.customer.id) ? "ring-2 ring-blue-500" : ""}`}>
            <CardBody className="space-y-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(item.customer.id)}
                  onChange={() => toggleSelect(item.customer.id)}
                  className="mt-1 w-4 h-4 accent-blue-600"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <Link href={`/customers/${item.customer.id}`} className="font-bold text-blue-600 hover:underline">
                      {item.customer.name}
                    </Link>
                    <Badge variant="danger">{formatCurrency(item.totalRemaining)}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {item.customer.phone} | {item.voucherCount} سند
                  </p>
                </div>
              </div>

              {/* Message preview */}
              <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
                <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed line-clamp-4">
                  {item.message}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyMessage(item.customer.id, item.message)}
                  className="flex-1"
                >
                  {copiedId === item.customer.id ? (
                    <><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> تم النسخ</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /> نسخ</>
                  )}
                </Button>
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => openWhatsApp(item)}
                  className="flex-1"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {sentMap[item.customer.id] ? "أُرسل ✓" : "واتساب"}
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
