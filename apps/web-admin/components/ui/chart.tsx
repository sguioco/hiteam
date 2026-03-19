"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    color?: string;
    label?: React.ReactNode;
  }
>;

type ChartContextValue = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextValue | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a ChartContainer");
  }

  return context;
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ReactElement;
  }
>(({ className, config, children, style, ...props }, ref) => {
  const chartStyle = Object.entries(config).reduce<Record<string, string>>(
    (accumulator, [key, value]) => {
      if (value.color) {
        accumulator[`--color-${key}`] = value.color;
      }

      return accumulator;
    },
    {},
  );

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        className={cn(
          "h-[320px] w-full [&_.recharts-cartesian-axis-tick_text]:fill-[color:var(--muted-foreground)] [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-[rgba(37,99,235,0.12)] [&_.recharts-tooltip-cursor]:fill-transparent [&_.recharts-reference-line_line]:stroke-[rgba(37,99,235,0.18)]",
          className,
        )}
        ref={ref}
        style={{ ...(chartStyle as React.CSSProperties), ...style }}
        {...props}
      >
        <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = "ChartContainer";

const ChartTooltip = RechartsPrimitive.Tooltip;

type TooltipPayloadItem = {
  color?: string;
  dataKey?: string;
  name?: string;
  payload?: Record<string, unknown>;
  value?: number | string;
};

function ChartTooltipContent({
  active,
  className,
  hideIndicator = false,
  hideLabel = false,
  label,
  payload,
}: {
  active?: boolean;
  className?: string;
  hideIndicator?: boolean;
  hideLabel?: boolean;
  label?: React.ReactNode;
  payload?: TooltipPayloadItem[];
}) {
  const { config } = useChart();

  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div
      className={cn(
        "grid min-w-[160px] gap-2 rounded-2xl border border-[rgba(24,24,27,0.08)] bg-white/96 px-3 py-2 text-xs shadow-[0_18px_40px_rgba(15,23,42,0.14)] backdrop-blur-sm",
        className,
      )}
    >
      {!hideLabel ? (
        <div className="font-medium text-[color:var(--foreground)]">{label}</div>
      ) : null}
      <div className="grid gap-1.5">
        {payload.map((item) => {
          const itemConfig = item.dataKey ? config[item.dataKey] : undefined;

          return (
            <div
              className="flex items-center justify-between gap-3 text-[color:var(--muted-foreground)]"
              key={item.dataKey ?? item.name}
            >
              <div className="flex items-center gap-2">
                {!hideIndicator ? (
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                ) : null}
                <span>{itemConfig?.label ?? item.name ?? item.dataKey}</span>
              </div>
              <span className="font-semibold text-[color:var(--foreground)]">
                {item.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { ChartContainer, ChartTooltip, ChartTooltipContent };
