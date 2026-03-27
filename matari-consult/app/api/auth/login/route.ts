import { NextRequest } from "next/server";
import { login } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = schema.parse(body);
    const result = await login(username, password);

    if (result.error) {
      return Response.json({ error: result.error }, { status: 401 });
    }
    return Response.json({ success: true, name: result.user?.name, role: result.user?.role });
  } catch {
    return Response.json({ error: "خطأ في البيانات المدخلة" }, { status: 400 });
  }
}
