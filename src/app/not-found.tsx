import { getI18n } from "@/i18n/server";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/display";

export default async function NotFound() {
  const { d } = await getI18n();

  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <EmptyState
        title={d.errors.notFound}
        body={d.errors.notFoundBody}
        action={<ButtonLink href="/assets">{d.nav.assets}</ButtonLink>}
      />
    </div>
  );
}
