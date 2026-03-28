import { PrismaClient, UserRole, PaymentMethod, ServiceType, VoucherStatus } from "../app/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 جاري إنشاء البيانات التجريبية...");

  // 1. Create users
  const adminHash = await bcrypt.hash("admin123", 12);
  const engHash = await bcrypt.hash("eng123", 12);
  const viewerHash = await bcrypt.hash("viewer123", 12);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      name: "عبدالعزيز حسن المطري",
      username: "admin",
      passwordHash: adminHash,
      role: UserRole.SUPER_ADMIN,
      email: "engmhi126@gmail.com",
      phone: "+966538986031",
    },
  });

  const accountant = await prisma.user.upsert({
    where: { username: "accountant" },
    update: {},
    create: {
      name: "محمد علي الزهراني",
      username: "accountant",
      passwordHash: await bcrypt.hash("acc123", 12),
      role: UserRole.ADMIN,
      phone: "+966501234567",
    },
  });

  const eng1 = await prisma.user.upsert({
    where: { username: "engineer" },
    update: {},
    create: {
      name: "أحمد خالد العمري",
      username: "engineer",
      passwordHash: engHash,
      role: UserRole.ENGINEER,
      phone: "+966509876543",
    },
  });

  const eng2 = await prisma.user.upsert({
    where: { username: "eng2" },
    update: {},
    create: {
      name: "سالم محمد الغامدي",
      username: "eng2",
      passwordHash: await bcrypt.hash("eng456", 12),
      role: UserRole.ENGINEER,
      phone: "+966512345678",
    },
  });

  const viewer = await prisma.user.upsert({
    where: { username: "viewer" },
    update: {},
    create: {
      name: "فهد عبدالله السهلي",
      username: "viewer",
      passwordHash: viewerHash,
      role: UserRole.VIEWER,
    },
  });

  console.log("✅ تم إنشاء المستخدمين");

  // 2. Create customers
  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { nationalId: "1234567890" },
      update: {},
      create: { name: "علي حسن المالكي", nationalId: "1234567890", phone: "0501111111", district: "حي النزهة", city: "جازان", email: "ali@example.com" },
    }),
    prisma.customer.upsert({
      where: { nationalId: "2345678901" },
      update: {},
      create: { name: "محمد سعد القحطاني", nationalId: "2345678901", phone: "0502222222", district: "حي الصفاء", city: "جازان" },
    }),
    prisma.customer.upsert({
      where: { nationalId: "3456789012" },
      update: {},
      create: { name: "عبدالله فهد الشهري", nationalId: "3456789012", phone: "0503333333", district: "حي الروضة", city: "أبها" },
    }),
    prisma.customer.upsert({
      where: { nationalId: "4567890123" },
      update: {},
      create: { name: "سعد عبدالرحمن الدوسري", nationalId: "4567890123", phone: "0504444444", district: "حي الملك فهد", city: "جدة" },
    }),
    prisma.customer.upsert({
      where: { nationalId: "5678901234" },
      update: {},
      create: { name: "خالد إبراهيم الزيد", nationalId: "5678901234", phone: "0505555555", district: "حي العزيزية", city: "الرياض" },
    }),
    prisma.customer.upsert({
      where: { nationalId: "6789012345" },
      update: {},
      create: { name: "فيصل محمد العتيبي", nationalId: "6789012345", phone: "0506666666", district: "حي السلام", city: "جازان" },
    }),
  ]);

  console.log("✅ تم إنشاء العملاء");

  // 3. Create vouchers
  const voucherData = [
    { customer: customers[0], engineer: eng1, totalAmount: 15000, paidAmount: 15000, serviceType: ServiceType.CIVIL, paymentMethod: PaymentMethod.CASH, description: "تصميم منزل سكني" },
    { customer: customers[0], engineer: eng1, totalAmount: 8000, paidAmount: 5000, serviceType: ServiceType.CIVIL, paymentMethod: PaymentMethod.BANK_TRANSFER, bankName: "بنك الراجحي", description: "إشراف مشروع بناء" },
    { customer: customers[1], engineer: eng1, totalAmount: 12000, paidAmount: 12000, serviceType: ServiceType.ARCHITECTURAL, paymentMethod: PaymentMethod.CASH, description: "تصميم معماري فيلا" },
    { customer: customers[2], engineer: eng2, totalAmount: 5000, paidAmount: 3000, serviceType: ServiceType.SURVEY, paymentMethod: PaymentMethod.NETWORK, description: "مسح ميداني أرض" },
    { customer: customers[3], engineer: eng2, totalAmount: 25000, paidAmount: 25000, serviceType: ServiceType.CIVIL, paymentMethod: PaymentMethod.BANK_TRANSFER, bankName: "البنك الأهلي", description: "إدارة مشروع تجاري" },
    { customer: customers[4], engineer: eng1, totalAmount: 7500, paidAmount: 0, serviceType: ServiceType.ARCHITECTURAL, paymentMethod: PaymentMethod.CASH, description: "تصميم واجهة مبنى" },
    { customer: customers[5], engineer: eng2, totalAmount: 18000, paidAmount: 10000, serviceType: ServiceType.CIVIL, paymentMethod: PaymentMethod.CASH, description: "تصميم وإشراف مستودع" },
    { customer: customers[1], engineer: eng1, totalAmount: 3500, paidAmount: 3500, serviceType: ServiceType.SURVEY, paymentMethod: PaymentMethod.NETWORK, description: "مسح طبوغرافي" },
  ];

  for (let i = 0; i < voucherData.length; i++) {
    const d = voucherData[i];
    const date = new Date();
    date.setDate(date.getDate() - (i * 7));

    const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;

    await prisma.voucherSequence.upsert({
      where: { yearMonth },
      update: { lastSeq: { increment: 1 } },
      create: { yearMonth, lastSeq: 1 },
    });

    const seq = await prisma.voucherSequence.findUnique({ where: { yearMonth } });
    const voucherNumber = `PV-${yearMonth}-${String(seq!.lastSeq).padStart(6, "0")}`;

    const existing = await prisma.voucher.findUnique({ where: { voucherNumber } });
    if (existing) continue;

    await prisma.voucher.create({
      data: {
        voucherNumber,
        date,
        customerId: d.customer.id,
        customerName: d.customer.name,
        nationalId: d.customer.nationalId,
        phone: d.customer.phone,
        district: d.customer.district,
        totalAmount: d.totalAmount,
        paidAmount: d.paidAmount,
        remainingAmount: d.totalAmount - d.paidAmount,
        amountInWords: `${d.paidAmount} ريال سعودي فقط لا غير`,
        paymentMethod: d.paymentMethod,
        bankName: (d as { bankName?: string }).bankName,
        serviceType: d.serviceType,
        description: d.description,
        engineerId: d.engineer.id,
        engineerName: d.engineer.name,
        accountantName: accountant.name,
        managementName: admin.name,
        status: VoucherStatus.ISSUED,
      },
    });
  }

  console.log("✅ تم إنشاء سندات القبض");

  // 4. Office settings
  await prisma.officeSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      officeName: "مكتب المطري للاستشارات الهندسية",
      phone: "+966538986031",
      email: "engmhi126@gmail.com",
      address: "جازان - العارضة - مجمع العبيدي - مقابل شاي فارس",
      city: "جازان",
    },
  });

  console.log("✅ تم إنشاء إعدادات المكتب");
  console.log("\n🎉 اكتملت البيانات التجريبية بنجاح!");
  console.log("\n📋 بيانات الدخول:");
  console.log("  مدير النظام: admin / admin123");
  console.log("  محاسب: accountant / acc123");
  console.log("  مهندس: engineer / eng123");
  console.log("  مهندس ثانٍ: eng2 / eng456");
  console.log("  مشاهد: viewer / viewer123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
