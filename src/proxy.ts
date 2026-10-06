import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "n5_session";

/**
 * Coarse gate only: bounce anonymous visitors away from the authenticated area
 * before rendering. Real authorisation (role + status checks) happens in the
 * pages and server actions themselves — see src/lib/auth/session.ts.
 */
const PROTECTED_PREFIXES = ["/dashboard", "/buyer", "/seller", "/admin", "/messages", "/buyers"];

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!isProtected) return NextResponse.next();

  if (await hasValidSession(request)) return NextResponse.next();

  const login = new URL("/login", request.url);
  login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/dashboard/:path*", "/buyer/:path*", "/seller/:path*", "/admin/:path*", "/messages/:path*", "/buyers/:path*"],
};
