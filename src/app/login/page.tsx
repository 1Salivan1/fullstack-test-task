import Link from "next/link";
import { redirect } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";
import { Card } from "@/components/ui/display";

export const metadata = { title: "Log in — N5Deal" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { d } = await getI18n();
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const { next } = await searchParams;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-14">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{d.auth.loginTitle}</h1>
        <p className="mt-1 text-sm text-muted">{d.auth.loginSubtitle}</p>
      </div>

      <Card>
        <LoginForm next={next} />
      </Card>

      <p className="text-sm text-muted">
        {d.auth.noAccount}{" "}
        <Link href="/register" className="text-accent underline">
          {d.auth.submitRegister}
        </Link>
      </p>
      <p className="text-sm text-muted">
        <Link href="/demo" className="text-accent underline">
          {d.auth.demoTitle}
        </Link>{" "}
        — {d.auth.demoSubtitle}
      </p>
    </div>
  );
}
