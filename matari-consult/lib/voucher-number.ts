import "server-only";
import { prisma } from "./db";

export async function generateVoucherNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const yearMonth = `${year}${month}`;

  // Atomic upsert + increment using raw query for concurrency safety
  const result = await prisma.$transaction(async (tx) => {
    const seq = await tx.voucherSequence.upsert({
      where: { yearMonth },
      update: { lastSeq: { increment: 1 } },
      create: { yearMonth, lastSeq: 1 },
    });
    return seq.lastSeq;
  });

  const seqStr = String(result).padStart(6, "0");
  return `PV-${yearMonth}-${seqStr}`;
}
