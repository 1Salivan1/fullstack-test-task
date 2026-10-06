import { notFound } from "next/navigation";
import { AssetStatus, Role } from "@prisma/client";
import { Eye, Sparkles } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { AssetForm } from "@/components/assets/asset-form";
import { Badge, PageHeader } from "@/components/ui/display";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Edit listing — N5Deal" };

export default async function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { d } = await getI18n();
  const user = await requireRole(Role.SELLER);

  const asset = await db.asset.findUnique({ where: { id } });
  // A seller may only ever edit their own listing, regardless of how they got here.
  if (!asset || asset.sellerId !== user.id) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader
        title={d.assets.editListing}
        subtitle={asset.title}
        actions={
          <>
            <Badge tone={asset.status === AssetStatus.PUBLISHED ? "accent" : "warning"}>
              {d.assetStatus[asset.status]}
            </Badge>
            <ButtonLink href={`/assets/${asset.id}`} variant="secondary" size="sm">
              <Eye className="size-4" />
              {d.assets.viewListing}
            </ButtonLink>
            <ButtonLink href={`/seller/assets/${asset.id}/matches`} size="sm">
              <Sparkles className="size-4" />
              {d.assets.matchesCta}
            </ButtonLink>
          </>
        }
      />

      {asset.status === AssetStatus.SUSPENDED ? (
        <p className="mt-4 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {d.assets.suspendedNotice}
        </p>
      ) : null}

      <div className="mt-6">
        <AssetForm
          initial={{
            id: asset.id,
            title: asset.title,
            summary: asset.summary,
            description: asset.description,
            sector: asset.sector,
            jurisdiction: asset.jurisdiction,
            licenseType: asset.licenseType,
            dealType: asset.dealType,
            currency: asset.currency,
            askingPrice: asset.askingPrice,
            revenue: asset.revenue,
            ebitda: asset.ebitda,
            employees: asset.employees,
            foundedYear: asset.foundedYear,
            highlights: asset.highlights,
            status: asset.status,
          }}
        />
      </div>
    </div>
  );
}
