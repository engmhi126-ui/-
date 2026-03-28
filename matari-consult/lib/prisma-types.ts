// Re-export Prisma types from generated client
export {
  UserRole,
  PaymentMethod,
  ServiceType,
  VoucherStatus,
  ReminderStatus,
  AuditAction,
} from "@/app/generated/prisma";

export type { User, Customer, Voucher } from "@/app/generated/prisma";
