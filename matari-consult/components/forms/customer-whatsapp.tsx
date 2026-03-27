"use client";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { generateWhatsAppReminder } from "@/lib/utils";

interface Props {
  customerName: string;
  phone: string;
  remaining: number;
  officeName: string;
  officePhone: string;
}

export function CustomerWhatsApp({ customerName, phone, remaining, officeName, officePhone }: Props) {
  const openWhatsApp = () => {
    const msg = generateWhatsAppReminder(customerName, remaining, officeName, officePhone);
    const cleaned = phone.replace(/\D/g, "");
    const num = cleaned.startsWith("966") ? cleaned : cleaned.startsWith("0") ? `966${cleaned.slice(1)}` : `966${cleaned}`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <Button variant="success" size="sm" onClick={openWhatsApp}>
      <MessageCircle className="w-4 h-4" />
      تذكير واتساب
    </Button>
  );
}
