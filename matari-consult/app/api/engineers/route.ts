import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { UserRole, AuditAction } from "@/app/generated/prisma";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().min(1),
  username: z.string().min(3),
  password: z.string().min(6),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole).default(UserRole.ENGINEER),
});

export async function GET(request: NextRequest) {
  await requireAuth();
  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");

  const where: Record<string, unknown> = { deletedAt: null };
  if (role) where.role = role;
  else where.role = { in: [UserRole.ENGINEER, UserRole.ADMIN] };

  const engineers = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
      _count: { select: { vouchers: { where: { deletedAt: null } } } },
    },
    orderBy: { name: "asc" },
  });

  const enriched = await Promise.all(
    engineers.map(async (eng) => {
      const stats = await prisma.voucher.aggregate({
        where: { engineerId: eng.id, deletedAt: null, status: "ISSUED" },
        _sum: { paidAmount: true, remainingAmount: true },
        _count: true,
      });
      return {
        ...eng,
        voucherCount: stats._count,
        totalCollected: Number(stats._sum.paidAmount || 0),
        totalOutstanding: Number(stats._sum.remainingAmount || 0),
      };
    })
  );

  return Response.json(enriched);
}

export async function POST(request: NextRequest) {
  const session = await requireAuth(UserRole.ADMIN);

  try {
    const body = await request.json();
    const data = createUserSchema.parse(body);

    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        username: data.username,
        passwordHash,
        email: data.email || null,
        phone: data.phone || null,
        role: data.role,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: AuditAction.CREATE_USER,
        entityType: "user",
        entityId: user.id,
        details: { username: user.username, role: user.role },
      },
    });

    return Response.json(
      { id: user.id, name: user.name, username: user.username, role: user.role },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "بيانات غير صحيحة", details: error.issues }, { status: 400 });
    }
    return Response.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
