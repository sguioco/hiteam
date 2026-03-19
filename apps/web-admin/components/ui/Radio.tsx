"use client";

import { cn } from "@/lib/utils";

export type RadioItem = {
  key: string;
  label: string;
  value?: number;
  disabled?: boolean;
};

type RadioProps = {
  ariaLabel: string;
  items: RadioItem[];
  name: string;
  onValueChange: (value: string) => void;
  value: string;
  className?: string;
};

export default function Radio({
  ariaLabel,
  items,
  name,
  onValueChange,
  value,
  className,
}: RadioProps) {
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.key === value),
  );

  return (
    <div
      aria-label={ariaLabel}
      className={cn("smart-radio", className)}
      role="tablist"
      style={
        {
          "--radio-count": items.length,
          "--radio-index": activeIndex,
        } as React.CSSProperties
      }
    >
      {items.map((item) => (
        <label
          aria-disabled={item.disabled}
          className="smart-radio__option"
          key={item.key}
        >
          <input
            checked={item.key === value}
            disabled={item.disabled}
            name={name}
            onChange={() => onValueChange(item.key)}
            type="radio"
          />
          <span className="smart-radio__copy">
            <span>{item.label}</span>
            {typeof item.value === "number" ? (
              <strong>{item.value}</strong>
            ) : null}
          </span>
        </label>
      ))}
      <span aria-hidden="true" className="smart-radio__selection" />
    </div>
  );
}
