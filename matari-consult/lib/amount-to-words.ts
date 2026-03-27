// تحويل الأرقام إلى كلمات عربية
const ones = [
  "",
  "واحد",
  "اثنان",
  "ثلاثة",
  "أربعة",
  "خمسة",
  "ستة",
  "سبعة",
  "ثمانية",
  "تسعة",
  "عشرة",
  "أحد عشر",
  "اثنا عشر",
  "ثلاثة عشر",
  "أربعة عشر",
  "خمسة عشر",
  "ستة عشر",
  "سبعة عشر",
  "ثمانية عشر",
  "تسعة عشر",
];

const tens = [
  "",
  "",
  "عشرون",
  "ثلاثون",
  "أربعون",
  "خمسون",
  "ستون",
  "سبعون",
  "ثمانون",
  "تسعون",
];

const hundreds = [
  "",
  "مائة",
  "مئتان",
  "ثلاثمائة",
  "أربعمائة",
  "خمسمائة",
  "ستمائة",
  "سبعمائة",
  "ثمانمائة",
  "تسعمائة",
];

function convertBelow1000(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ones[n];
  if (n < 100) {
    const ten = Math.floor(n / 10);
    const one = n % 10;
    return one === 0 ? tens[ten] : `${ones[one]} و${tens[ten]}`;
  }
  const h = Math.floor(n / 100);
  const remainder = n % 100;
  if (remainder === 0) return hundreds[h];
  return `${hundreds[h]} و${convertBelow1000(remainder)}`;
}

export function amountToArabicWords(amount: number): string {
  if (amount === 0) return "صفر ريال سعودي";

  const intPart = Math.floor(amount);
  const decPart = Math.round((amount - intPart) * 100);

  const billions = Math.floor(intPart / 1_000_000_000);
  const millions = Math.floor((intPart % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((intPart % 1_000_000) / 1_000);
  const remainder = intPart % 1_000;

  const parts: string[] = [];

  if (billions > 0) parts.push(`${convertBelow1000(billions)} مليار`);
  if (millions > 0) parts.push(`${convertBelow1000(millions)} مليون`);
  if (thousands > 0) parts.push(`${convertBelow1000(thousands)} ألف`);
  if (remainder > 0) parts.push(convertBelow1000(remainder));

  let result = parts.join(" و") + " ريال سعودي";
  if (decPart > 0) {
    result += ` و${convertBelow1000(decPart)} هللة`;
  }
  result += " فقط لا غير";
  return result;
}
