import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "غير مصرح" }, { status: 401 });
  return Response.json(user);
}
