import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { createSession, deleteSession, getSession } from "./session";
import { UserRole, AuditAction } from "@/app/generated/prisma";

export async function login(username: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { username, deletedAt: null },
  });
  if (!user || !user.isActive) return { error: "بيانات الدخول غير صحيحة" };

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return { error: "بيانات الدخول غير صحيحة" };

  await createSession({
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: AuditAction.LOGIN,
      details: { username: user.username },
    },
  });

  return { success: true, user };
}

export async function logout() {
  const session = await getSession();
  if (session) {
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: AuditAction.LOGOUT,
      },
    });
  }
  await deleteSession();
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId, deletedAt: null, isActive: true },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      phone: true,
      avatar: true,
    },
  });
  return user;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function canAccess(userRole: UserRole, requiredRole: UserRole): boolean {
  const hierarchy: UserRole[] = [
    UserRole.VIEWER,
    UserRole.ENGINEER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  ];
  return hierarchy.indexOf(userRole) >= hierarchy.indexOf(requiredRole);
}
