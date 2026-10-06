import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const CONTROL =
  "w-full rounded-md bg-surface-2 border border-border px-3 py-2 text-sm text-ink " +
  "outline-none transition-colors focus:border-accent/70 focus:ring-1 focus:ring-accent/30 " +
  "disabled:opacity-60 disabled:cursor-not-allowed";

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <label htmlFor={htmlFor} className="text-xs font-medium tracking-wide text-muted uppercase">
          {label}
        </label>
      ) : null}
      {children}
      {hint && !error ? <p className="text-xs text-muted">{hint}</p> : null}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(CONTROL, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(CONTROL, "min-h-24 resize-y", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(CONTROL, "appearance-none pr-8", className)} {...props}>
      {children}
    </select>
  );
}

/**
 * Multi-select rendered as toggleable chips backed by real checkboxes, so it
 * works inside a plain <form> submission (and therefore inside server actions)
 * without any client-side state.
 */
export function CheckboxChips({
  name,
  options,
  selected,
  labels,
}: {
  name: string;
  options: readonly string[];
  selected: readonly string[];
  labels?: Record<string, string>;
}) {
  const active = new Set(selected);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isActive = active.has(option);
        return (
          <label
            key={option}
            className={cn(
              "cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-colors",
              isActive
                ? "border-accent/60 bg-accent-soft text-accent"
                : "border-border bg-surface-2 text-muted hover:border-border-strong hover:text-ink",
            )}
          >
            <input
              type="checkbox"
              name={name}
              value={option}
              defaultChecked={isActive}
              className="sr-only"
            />
            {labels?.[option] ?? option}
          </label>
        );
      })}
    </div>
  );
}

export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
      {children}
    </p>
  );
}

export function FormSuccess({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p className="rounded-md border border-accent/40 bg-accent-soft px-3 py-2 text-sm text-accent">
      {children}
    </p>
  );
}
