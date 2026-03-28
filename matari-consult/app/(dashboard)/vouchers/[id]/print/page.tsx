import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/dal";
import { notFound } from "next/navigation";
import { formatCurrency, formatDate, serviceTypeLabel, paymentMethodLabel } from "@/lib/utils";
import { UserRole } from "@/app/generated/prisma";

export default async function PrintVoucherPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  const { id } = await params;

  const [voucher, settings] = await Promise.all([
    prisma.voucher.findUnique({
      where: { id, deletedAt: null },
      include: { customer: true, engineer: { select: { name: true } } },
    }),
    prisma.officeSettings.findFirst(),
  ]);

  if (!voucher) notFound();
  if (session.role === UserRole.ENGINEER && voucher.engineerId !== session.userId) notFound();

  const officeName = settings?.officeName || "مكتب المطري للاستشارات الهندسية";

  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>سند قبض - {voucher.voucherNumber}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Cairo', sans-serif; direction: rtl; background: white; padding: 20px; }
          @page { size: A4; margin: 1.5cm; }
          @media print { body { padding: 0; } .no-print { display: none; } }
          .voucher { max-width: 800px; margin: 0 auto; border: 2px solid #1d4ed8; border-radius: 12px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #1d4ed8, #1e40af); color: white; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; }
          .office-name { font-size: 20px; font-weight: 900; }
          .office-sub { font-size: 11px; opacity: 0.8; margin-top: 4px; }
          .voucher-title { background: rgba(255,255,255,0.2); padding: 10px 20px; border-radius: 8px; text-align: center; }
          .voucher-title .arabic { font-size: 22px; font-weight: 900; }
          .voucher-title .english { font-size: 11px; opacity: 0.8; }
          .meta { background: rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 6px; text-align: left; font-size: 13px; }
          .amounts { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; padding: 16px 24px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
          .amount-box { text-align: center; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; background: white; }
          .amount-label { font-size: 11px; color: #64748b; margin-bottom: 4px; }
          .amount-value { font-size: 16px; font-weight: 800; }
          .amount-total .amount-value { color: #1d4ed8; }
          .amount-paid .amount-value { color: #059669; }
          .amount-remaining .amount-value { color: #dc2626; }
          .body { padding: 20px 24px; }
          .field-row { display: flex; align-items: center; gap: 12px; border-bottom: 1px dashed #cbd5e1; padding: 8px 0; }
          .field-label { font-size: 13px; font-weight: 700; color: #374151; min-width: 140px; flex-shrink: 0; }
          .field-value { font-size: 14px; font-weight: 600; color: #111827; flex: 1; }
          .amount-words { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; padding: 10px 14px; margin: 12px 0; }
          .amount-words-text { font-size: 14px; font-weight: 700; color: #92400e; }
          .payment-methods, .service-types { display: flex; gap: 16px; align-items: center; padding: 8px 0; border-bottom: 1px dashed #cbd5e1; }
          .pm-label, .st-label { font-size: 13px; font-weight: 700; color: #374151; min-width: 140px; }
          .radio-item { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #374151; }
          .radio-circle { width: 16px; height: 16px; border-radius: 50%; border: 2px solid #94a3b8; }
          .radio-circle.checked { background: #1d4ed8; border-color: #1d4ed8; }
          .checkbox-item { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #374151; }
          .checkbox-box { width: 16px; height: 16px; border-radius: 3px; border: 2px solid #94a3b8; }
          .checkbox-box.checked { background: #1d4ed8; border-color: #1d4ed8; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; padding: 20px 0 0; border-top: 1px solid #e2e8f0; margin-top: 20px; }
          .sig-box { text-align: center; }
          .sig-label { font-size: 11px; color: #64748b; margin-bottom: 30px; }
          .sig-name { font-size: 13px; font-weight: 600; border-top: 1px solid #cbd5e1; padding-top: 6px; }
          .footer { background: #f8fafc; padding: 10px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; }
          .print-btn { position: fixed; top: 20px; left: 20px; padding: 10px 20px; background: #1d4ed8; color: white; border: none; border-radius: 8px; cursor: pointer; font-family: 'Cairo', sans-serif; font-size: 14px; font-weight: 600; z-index: 100; }
          @media print { .print-btn { display: none; } }
        `}</style>
      </head>
      <body>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <button className="print-btn" onClick={"window.print()" as any}>🖨️ طباعة</button>

        <div className="voucher">
          {/* Header */}
          <div className="header">
            <div>
              <div className="office-name">{officeName}</div>
              <div className="office-sub">A.H. AL-MATRI FOR ENGINEERING CONSULT</div>
              <div className="office-sub" style={{ marginTop: 4 }}>
                📱 {settings?.phone} | ✉️ {settings?.email}
              </div>
            </div>
            <div className="voucher-title">
              <div className="arabic">سند قبض</div>
              <div className="english">Payment Voucher</div>
            </div>
            <div className="meta">
              <div>رقم: <strong>{voucher.voucherNumber}</strong></div>
              <div style={{ marginTop: 4 }}>التاريخ: <strong>{formatDate(voucher.date)}</strong></div>
            </div>
          </div>

          {/* Amounts */}
          <div className="amounts">
            <div className="amount-box amount-total">
              <div className="amount-label">الإجمالي</div>
              <div className="amount-value">{formatCurrency(Number(voucher.totalAmount))}</div>
            </div>
            <div className="amount-box amount-paid">
              <div className="amount-label">المدفوع</div>
              <div className="amount-value">{formatCurrency(Number(voucher.paidAmount))}</div>
            </div>
            <div className="amount-box amount-remaining">
              <div className="amount-label">المتبقي</div>
              <div className="amount-value" style={{ color: Number(voucher.remainingAmount) > 0 ? "#dc2626" : "#059669" }}>
                {formatCurrency(Number(voucher.remainingAmount))}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="body">
            <div className="field-row">
              <span className="field-label">استلمنا من السيد / السادة</span>
              <span className="field-value">{voucher.customerName}</span>
            </div>
            {voucher.nationalId && (
              <div className="field-row">
                <span className="field-label">رقم الهوية</span>
                <span className="field-value">{voucher.nationalId}</span>
              </div>
            )}
            <div className="field-row">
              <span className="field-label">رقم الجوال</span>
              <span className="field-value">{voucher.phone}</span>
              {voucher.district && (
                <>
                  <span className="field-label" style={{ marginRight: 24 }}>الحي</span>
                  <span className="field-value">{voucher.district}</span>
                </>
              )}
            </div>

            <div className="field-row">
              <span className="field-label">مبلغ وقدرة</span>
              <span className="field-value" style={{ fontSize: 18, fontWeight: 900, color: "#1d4ed8" }}>
                {formatCurrency(Number(voucher.paidAmount))}
              </span>
            </div>

            {voucher.amountInWords && (
              <div className="amount-words">
                <span className="amount-words-text">فقط لا غير: {voucher.amountInWords}</span>
              </div>
            )}

            {/* Payment method */}
            <div className="payment-methods">
              <span className="pm-label">طريقة الدفع:</span>
              {[
                { val: "CASH", label: "نقداً" },
                { val: "NETWORK", label: "شبكة" },
                { val: "BANK_TRANSFER", label: `تحويل على بنك${voucher.bankName ? ` (${voucher.bankName})` : ""}` },
              ].map(({ val, label }) => (
                <div key={val} className="radio-item">
                  <div className={`radio-circle ${voucher.paymentMethod === val ? "checked" : ""}`} />
                  <span>{label}</span>
                </div>
              ))}
            </div>

            {voucher.description && (
              <div className="field-row">
                <span className="field-label">وذلك قيمة</span>
                <span className="field-value">{voucher.description}</span>
              </div>
            )}

            {/* Service type */}
            <div className="service-types">
              <span className="st-label">نوع الخدمة:</span>
              {[
                { val: "CIVIL", label: "هندسة مدنية" },
                { val: "ARCHITECTURAL", label: "هندسة معمارية" },
                { val: "SURVEY", label: "هندسة مساحة" },
                { val: "OTHER", label: "أخرى" },
              ].map(({ val, label }) => (
                <div key={val} className="checkbox-item">
                  <div className={`checkbox-box ${voucher.serviceType === val ? "checked" : ""}`} />
                  <span>{label}</span>
                </div>
              ))}
            </div>

            {/* Signatures */}
            <div className="signatures">
              <div className="sig-box">
                <div className="sig-label">المهندس</div>
                <div className="sig-name">{voucher.engineerName}</div>
              </div>
              <div className="sig-box">
                <div className="sig-label">المحاسب</div>
                <div className="sig-name">{voucher.accountantName || "........................"}</div>
              </div>
              <div className="sig-box">
                <div className="sig-label">توقيع المستلم</div>
                <div className="sig-name">........................</div>
              </div>
            </div>

            {/* Management */}
            <div style={{ textAlign: "center", marginTop: 12, paddingTop: 12, borderTop: "1px dashed #e2e8f0" }}>
              <span style={{ fontSize: 12, color: "#64748b" }}>الإدارة: </span>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{voucher.managementName || "........................"}</span>
            </div>
          </div>

          <div className="footer">
            تصميم وإشراف - طرق - مساحة - إدارة مشاريع - حساب كميات | {officeName}
          </div>
        </div>

        <script dangerouslySetInnerHTML={{ __html: "document.querySelector('.print-btn').onclick = () => window.print()" }} />
      </body>
    </html>
  );
}
