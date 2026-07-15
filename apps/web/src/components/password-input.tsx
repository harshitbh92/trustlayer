"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import clsx from "clsx";

type PasswordInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  /** Extra classes for the outer wrapper (e.g. "mt-1"). */
  wrapperClassName?: string;
};

export function PasswordInput({
  className,
  wrapperClassName,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={clsx("flex items-stretch gap-2", wrapperClassName)}>
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={clsx("input min-w-0 flex-1", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="inline-flex shrink-0 items-center justify-center rounded-xl border border-border bg-surface-elevated px-3 text-muted transition hover:border-accent/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label={visible ? "Hide password" : "Show password"}
        title={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? (
          <EyeOff className="h-4 w-4" aria-hidden />
        ) : (
          <Eye className="h-4 w-4" aria-hidden />
        )}
      </button>
    </div>
  );
}
