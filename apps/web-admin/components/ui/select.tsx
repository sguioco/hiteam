"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

function SelectTriggerLabel({
  children,
  className,
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "block truncate text-left text-sm font-medium text-[color:var(--foreground)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

function SelectOptionIcon({
  children,
  className,
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-select-icon
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[rgba(227,231,239,0.78)] text-[color:var(--foreground)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

function SelectOptionAvatar({
  src,
  alt,
  fallback,
  className,
}: {
  src?: string | null;
  alt?: string;
  fallback: string;
  className?: string;
}) {
  if (src) {
    return (
      <img
        alt={alt ?? ""}
        className={cn("size-8 shrink-0 rounded-full object-cover", className)}
        src={src}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#d8e3ff_0%,#9eb7ff_100%)] text-[0.76rem] font-semibold uppercase tracking-[0.08em] text-[#1b3ff5]",
        className,
      )}
    >
      {fallback}
    </span>
  );
}

function SelectOptionText({
  children,
  className,
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("grid min-w-0 gap-0.5", className)}>{children}</span>
  );
}

function SelectOptionTitle({
  children,
  className,
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "truncate text-sm font-semibold leading-[1.2] text-current",
        className,
      )}
    >
      {children}
    </span>
  );
}

function SelectOptionDescription({
  children,
  className,
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "truncate text-xs leading-[1.25] text-[rgba(72,84,104,0.72)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

function SelectOptionContent({
  className,
  children,
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "flex min-w-0 items-center gap-3 text-left [&_[data-select-description]]:text-[rgba(72,84,104,0.72)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    className={cn(
      "group inline-flex min-h-11 w-full items-center justify-between gap-3 rounded-[20px] border border-[rgba(24,24,27,0.12)] bg-white px-3 py-1 text-[color:var(--foreground)] shadow-[0_0_0_0_rgba(15,23,42,0.04)] transition-[box-shadow,transform,background-color] duration-200 hover:bg-[rgba(255,255,255,1)] hover:shadow-[0_0_0_4px_rgba(15,23,42,0.04)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)] data-[placeholder]:text-[color:var(--muted-foreground)] data-[state=open]:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    ref={ref}
    {...props}
  >
    <span className="min-w-0 flex-1">{children}</span>
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="size-4 shrink-0 text-[rgba(72,84,104,0.72)] transition-transform duration-200 group-data-[state=open]:rotate-180 group-data-[state=open]:text-[color:var(--foreground)]" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    className={cn(
      "flex cursor-default items-center justify-center py-2 text-[color:var(--muted-foreground)]",
      className,
    )}
    ref={ref}
    {...props}
  >
    <ChevronUp className="size-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    className={cn(
      "flex cursor-default items-center justify-center py-2 text-[color:var(--muted-foreground)]",
      className,
    )}
    ref={ref}
    {...props}
  >
    <ChevronDown className="size-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      className={cn(
        "relative z-50 max-h-[min(380px,80vh)] min-w-[220px] overflow-hidden rounded-[26px] border border-[rgba(24,24,27,0.12)] bg-white/98 text-[color:var(--foreground)] shadow-[0_22px_54px_rgba(15,23,42,0.16)] backdrop-blur-sm data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className,
      )}
      position={position}
      ref={ref}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "max-h-[min(364px,76vh)] overflow-y-auto px-2 py-2",
          position === "popper" &&
            "w-full min-w-[max(var(--radix-select-trigger-width),220px)]",
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    className={cn(
      "sticky top-0 z-10 -mx-2 mb-2 block bg-white/96 px-3 pt-3 pb-2 text-[11px] font-medium uppercase tracking-[0.15em] text-[rgba(72,84,104,0.66)] backdrop-blur-sm",
      className,
    )}
    ref={ref}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    className={cn(
      "relative flex min-h-[38px] w-full cursor-default select-none items-center rounded-[20px] border border-transparent px-3 py-2 pr-10 text-sm outline-none transition-[background-color,color,transform] duration-150 focus:bg-[rgba(15,23,42,0.04)] data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[state=checked]:bg-[color:var(--accent)] data-[state=checked]:text-white data-[state=checked]:[&_[data-select-description]]:text-white/70 data-[state=checked]:[&_[data-select-icon]]:bg-white/18 data-[state=checked]:[&_[data-select-icon]]:text-white data-[state=checked]:[&_[data-select-icon]_svg]:!text-white",
      className,
    )}
    ref={ref}
    {...props}
  >
    <SelectPrimitive.ItemText asChild>
      <span className="min-w-0 flex-1">{children}</span>
    </SelectPrimitive.ItemText>
    <span className="absolute right-3 flex size-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="size-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    className={cn("my-2 h-px bg-[rgba(24,24,27,0.08)] first:hidden", className)}
    ref={ref}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

type AppSelectOption = {
  label: React.ReactNode;
  value: string;
};

type AppSelectFieldProps = {
  className?: string;
  contentClassName?: string;
  emptyLabel?: React.ReactNode;
  onValueChange: (value: string) => void;
  options: AppSelectOption[];
  placeholder?: string;
  triggerClassName?: string;
  value?: string | null;
};

const APP_SELECT_EMPTY_VALUE = "__app_select_empty__";

function AppSelectField({
  className,
  contentClassName,
  emptyLabel,
  onValueChange,
  options,
  placeholder,
  triggerClassName,
  value,
}: AppSelectFieldProps) {
  const hasEmptyOption = emptyLabel !== undefined;
  const normalizedValue =
    value && value.length > 0
      ? value
      : hasEmptyOption
        ? APP_SELECT_EMPTY_VALUE
        : undefined;

  return (
    <Select
      value={normalizedValue}
      onValueChange={(nextValue) =>
        onValueChange(nextValue === APP_SELECT_EMPTY_VALUE ? "" : nextValue)
      }
    >
      <SelectTrigger className={cn("w-full", triggerClassName, className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        {hasEmptyOption ? (
          <SelectItem value={APP_SELECT_EMPTY_VALUE}>{emptyLabel}</SelectItem>
        ) : null}
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export {
  AppSelectField,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectOptionAvatar,
  SelectOptionContent,
  SelectOptionDescription,
  SelectOptionIcon,
  SelectOptionText,
  SelectOptionTitle,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectTriggerLabel,
  SelectValue,
};
