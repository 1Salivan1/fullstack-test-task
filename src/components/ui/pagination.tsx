import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonClass } from "./button";

export function Pagination({
  page,
  pageCount,
  hrefFor,
  labels,
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
  labels: { previous: string; next: string; page: (current: number, total: number) => string };
}) {
  if (pageCount <= 1) return null;

  return (
    <nav className="flex items-center justify-between gap-3" aria-label="Pagination">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={buttonClass("secondary", "sm")}>
          <ChevronLeft className="size-4" />
          {labels.previous}
        </Link>
      ) : (
        <span />
      )}

      <span className="text-xs text-muted">{labels.page(page, pageCount)}</span>

      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className={buttonClass("secondary", "sm")}>
          {labels.next}
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
