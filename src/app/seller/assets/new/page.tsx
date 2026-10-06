import { Role } from "@prisma/client";
import { getI18n } from "@/i18n/server";
import { requireRole } from "@/lib/auth/session";
import { AssetForm } from "@/components/assets/asset-form";
import { PageHeader } from "@/components/ui/display";

export const metadata = { title: "New listing — N5Deal" };

export default async function NewAssetPage() {
  const { d } = await getI18n();
  await requireRole(Role.SELLER);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader title={d.assets.newListing} subtitle={d.assets.myListingsSubtitle} />
      <div className="mt-6">
        <AssetForm />
      </div>
    </div>
  );
}
