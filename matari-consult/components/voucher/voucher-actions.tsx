"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Copy, CheckCircle } from "lucide-react";
import { generateWhatsAppReminder, formatCurrency } from "@/lib/utils";

interface Props {
  voucher: {
    customerName: string;
    phone: string;
    remainingAmount: string | number | { toString(): string };
  };
  officeName: string;
  officePhone: string;
}

export function VoucherActions({ voucher, officeName, officePhone }: Props) {
  const [copied, setCopied] = useState(false);

  const remaining = Number(voucher.remainingAmount);
  const msg = generateWhatsAppReminder(voucher.customerName, remaining, officeName, officePhone);

  const copyMessage = async () => {
    await navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openWhatsApp = () => {
    const cleaned = voucher.phone.replace(/\D/g, "");
    const phone = cleaned.startsWith("966") ? cleaned : cleaned.startsWith("0") ? `966${cleaned.slice(1)}` : `966${cleaned}`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  if (remaining <= 0) return null;

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={copyMessage}>
        {copied ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
        {copied ? "تم النسخ" : "نسخ الرسالة"}
      </Button>
      <Button variant="success" size="sm" onClick={openWhatsApp}>
        <MessageCircle className="w-4 h-4" />
        واتساب
      </Button>
    </div>
  );
}
