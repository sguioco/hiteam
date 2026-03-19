"use client";

export type DynamicToogleTone =
  | "all"
  | "present"
  | "absent"
  | "late"
  | "shift"
  | "break"
  | "checked"
  | "issues";

export type DynamicToogleItem = {
  key: string;
  label: string;
  tone: DynamicToogleTone;
  value: number;
};

type DynamicToogleProps = {
  items: DynamicToogleItem[];
  value: string;
  onValueChange: (value: string) => void;
};

export function DynamicToogle({
  items,
  value,
  onValueChange,
}: DynamicToogleProps) {
  return (
    <div aria-label="Фильтр посещаемости" className="dynamic-toogle" role="tablist">
      {items.map((item) => {
        const isActive = item.key === value;

        return (
          <button
            aria-selected={isActive}
            className={`dynamic-toogle__item is-${item.tone}${isActive ? " is-active" : ""}`}
            key={item.key}
            onClick={() => onValueChange(item.key)}
            role="tab"
            type="button"
          >
            <span className="dynamic-toogle__label">{item.label}</span>
            <strong className="dynamic-toogle__value">{item.value}</strong>
          </button>
        );
      })}
    </div>
  );
}
