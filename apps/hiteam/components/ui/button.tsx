import * as React from "react"

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>

export function Button({ className = "", type = "button", ...props }: ButtonProps) {
  const baseClassName =
    "inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 disabled:pointer-events-none disabled:opacity-50"

  return <button className={`${baseClassName} ${className}`.trim()} type={type} {...props} />
}
