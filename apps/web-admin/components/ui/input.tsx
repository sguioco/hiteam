import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full min-w-0 rounded-xl border border-[color:var(--border)] bg-white px-4 py-2.5 text-sm text-[color:var(--foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.88)] transition-[border-color,box-shadow,background-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[color:var(--foreground)] placeholder:text-[color:var(--muted-foreground)] focus-visible:border-[color:var(--ring)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/15 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/30",
        className
      )}
      {...props}
    />
  )
}

export { Input }
