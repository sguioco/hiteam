"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type SelectableOptionButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onSelect"
> & {
  closeOnSelected?: boolean;
  selected: boolean;
  onClose: () => void;
  onSelect: () => void;
};

function SelectableOptionButton({
  children,
  className,
  closeOnSelected = true,
  onClick,
  onClose,
  onSelect,
  selected,
  type = "button",
  ...props
}: SelectableOptionButtonProps) {
  return (
    <button
      aria-selected={selected}
      className={cn(
        "relative flex min-h-[48px] w-full items-center gap-3 rounded-[20px] px-3 py-2 pr-10 text-left transition-[background-color,color,transform] duration-150 active:scale-[0.96]",
        selected
          ? "bg-[color:var(--accent)] text-white"
          : "text-foreground hover:bg-[rgba(15,23,42,0.05)]",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) {
          return;
        }

        if (selected && closeOnSelected) {
          onClose();
          return;
        }

        onSelect();
      }}
      role="option"
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

export { SelectableOptionButton };
