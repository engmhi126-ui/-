import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/session";

const PUBLIC_ROUTES = ["/login", "/api/auth/login"];
const DEFAULT_REDIRECT = "/dashboard";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Allow API routes for telegram and verification
  if (pathname.startsWith("/api/telegram") || pathname.startsWith("/verify")) {
    return NextResponse.next();
  }

  // Check session for protected routes
  const token = request.cookies.get("matari_session")?.value;
  const session = token ? await decrypt(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If logged in and visiting /login, redirect to dashboard
  if (pathname === "/login") {
    return NextResponse.redirect(new URL(DEFAULT_REDIRECT, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|fonts|public).*)",
  ],
};
