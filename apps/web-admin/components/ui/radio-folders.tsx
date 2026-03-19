"use client";

import { cn } from "@/lib/utils";

export type RadioFoldersItem = {
  key: string;
  label: string;
  value?: number;
  disabled?: boolean;
};

type RadioFoldersProps = {
  ariaLabel: string;
  items: RadioFoldersItem[];
  name: string;
  onValueChange: (value: string) => void;
  value: string;
  className?: string;
  nowrap?: boolean;
};

export function RadioFolders({
  ariaLabel,
  items,
  name,
  onValueChange,
  value,
  className,
  nowrap = false,
}: RadioFoldersProps) {
  return (
    <div
      aria-label={ariaLabel}
      className={cn("radio-inputs", nowrap && "is-nowrap", className)}
      role="tablist"
    >
      {items.map((item) => {
        const inputId = `${name}-${item.key}`;

        return (
          <label
            aria-disabled={item.disabled}
            className="radio"
            key={item.key}
            role="presentation"
          >
            <input
              checked={item.key === value}
              disabled={item.disabled}
              id={inputId}
              name={name}
              onChange={() => onValueChange(item.key)}
              role="tab"
              type="radio"
            />
            <span className="name">
              <span className="pre-name" />
              <span className="pos-name" />
              <span className="radio-tab-copy">
                <span>{item.label}</span>
                {typeof item.value === "number" ? (
                  <strong>{item.value}</strong>
                ) : null}
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
