"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * A <select> inside a GET form that submits on change. The surrounding form
 * still works without JavaScript via its Apply button — this only removes the
 * extra click for sorting.
 */
export function AutoSubmitSelect({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select
      {...props}
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
      className={cn(
        "rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-accent/70",
        className,
      )}
    >
      {children}
    </select>
  );
}
