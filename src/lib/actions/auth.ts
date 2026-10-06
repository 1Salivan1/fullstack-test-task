"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { InvestorType, Role, UserStatus } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { getI18n } from "@/i18n/server";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";
import type { ActionState } from "./types";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  next: z.string().optional(),
});

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  companyName: z.string().trim().min(2).max(160),
  country: z.string().trim().min(2).max(80),
  role: z.enum([Role.BUYER, Role.SELLER]),
});

/** `next` is attacker-controlled, so only same-site relative paths are honoured. */
function safeRedirectTarget(next: string | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { d } = await getI18n();
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: d.auth.invalidCredentials };

  const { email, password, next } = parsed.data;
  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });

  // Same message whether the account is missing or the password is wrong, so
  // the form cannot be used to enumerate registered emails.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: d.auth.invalidCredentials };
  }
  if (user.status === UserStatus.SUSPENDED) return { error: d.auth.suspendedAccount };
  if (user.status === UserStatus.REMOVED) return { error: d.auth.removedAccount };

  await createSession(user.id);
  redirect(safeRedirectTarget(next));
}

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { d, locale } = await getI18n();
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key === "password") fieldErrors[key] = d.validation.tooShort(8);
      else if (key === "email") fieldErrors[key] = d.validation.invalidEmail;
      else fieldErrors[key] = d.validation.required;
    }
    return { fieldErrors };
  }

  const data = parsed.data;
  const email = data.email.toLowerCase().trim();
  if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
    return { fieldErrors: { email: d.auth.emailTaken } };
  }

  const user = await db.user.create({
    data: {
      email,
      name: data.name,
      role: data.role,
      locale,
      passwordHash: await hashPassword(data.password),
      ...(data.role === Role.BUYER
        ? {
            buyerProfile: {
              create: {
                companyName: data.companyName,
                country: data.country,
                investorType: InvestorType.STRATEGIC,
              },
            },
          }
        : {
            sellerProfile: {
              create: { companyName: data.companyName, country: data.country },
            },
          }),
    },
  });

  await createSession(user.id);
  redirect(data.role === Role.BUYER ? "/buyer/profile" : "/seller/assets");
}

/**
 * One-click demo login. Only ever authenticates an existing seeded account and
 * never creates or elevates one, so the convenience cannot be used to mint a
 * manager session.
 */
export async function demoLoginAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "")
    .toLowerCase()
    .trim();
  if (!email.endsWith("@n5deal.demo")) redirect("/login");

  const user = await db.user.findUnique({ where: { email } });
  if (!user) redirect("/login?error=demo");
  if (user.status !== UserStatus.ACTIVE) redirect("/login?error=suspended");

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function setLocaleAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "");
  const next = String(formData.get("next") ?? "/");
  if (isLocale(locale)) {
    const store = await cookies();
    store.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  revalidatePath("/", "layout");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}
