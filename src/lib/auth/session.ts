import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify, SignJWT } from "jose";
import { Role, UserStatus, type User } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const SESSION_COOKIE = "n5_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function secret() {
  return new TextEncoder().encode(env().AUTH_SECRET);
}

/**
 * The token carries only the user id. Role and status are re-read from the
 * database on every request, so a manager suspending someone takes effect
 * immediately instead of waiting for their token to expire.
 */
export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export type SessionUser = User;

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const userId = await verifySessionToken(token);
  if (!userId) return null;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.status !== UserStatus.ACTIVE) return null;
  return user;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Authorisation is enforced here, inside the server code that reads data —
 * never only in the proxy, which can be bypassed by a route refactor.
 */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}

export const isManager = (user: SessionUser | null) => user?.role === Role.MANAGER;
