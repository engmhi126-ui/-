import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 2,
  }).format(num);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function serviceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    CIVIL: "هندسة مدنية",
    ARCHITECTURAL: "هندسة معمارية",
    SURVEY: "هندسة مساحة",
    OTHER: "أخرى",
  };
  return labels[type] || type;
}

export function paymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    CASH: "نقداً",
    NETWORK: "شبكة",
    BANK_TRANSFER: "تحويل على بنك",
  };
  return labels[method] || method;
}

export function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    SUPER_ADMIN: "مدير النظام",
    ADMIN: "إدارة / محاسب",
    ENGINEER: "مهندس",
    VIEWER: "مشاهد فقط",
  };
  return labels[role] || role;
}

export function voucherStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: "مسودة",
    ISSUED: "صادر",
    CANCELLED: "ملغي",
  };
  return labels[status] || status;
}

export function reminderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    NOT_SENT: "لم يُرسل",
    SENT: "مُرسل",
    RESPONDED: "استجاب",
    PAID: "سُدِّد",
  };
  return labels[status] || status;
}

export function generateWhatsAppReminder(
  customerName: string,
  amount: number,
  officeName: string,
  officePhone: string
): string {
  return `السلام عليكم ورحمة الله وبركاته

عميلنا الكريم / ${customerName}

نود إشعاركم بأن لديكم مبلغًا متبقيًا قدره ${formatCurrency(amount)} على الخدمة المقدمة من ${officeName}.

نأمل التكرم بسداد المستحق في أقرب وقت ممكن.

للتواصل: ${officePhone}

شكرًا لتعاملكم معنا 🙏`;
}
