import Link from "next/link";
import { redirect } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth/session";
import { Card } from "@/components/ui/display";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Sign up — N5Deal" };

export default async function RegisterPage() {
  const { d } = await getI18n();
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-14">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{d.auth.registerTitle}</h1>
        <p className="mt-1 text-sm text-muted">{d.auth.registerSubtitle}</p>
      </div>

      <Card>
        <RegisterForm />
      </Card>

      <p className="text-sm text-muted">
        {d.auth.hasAccount}{" "}
        <Link href="/login" className="text-accent underline">
          {d.auth.submitLogin}
        </Link>
      </p>
    </div>
  );
}
