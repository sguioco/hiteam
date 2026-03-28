"use client";

import { useMemo, useState } from "react";
import { endOfMonth, endOfWeek, getLocalTimeZone, startOfMonth, startOfWeek, today } from "@internationalized/date";
import { useControlledState } from "@react-stately/utils";
import { Calendar as CalendarIcon } from "@untitledui/icons";
import { useDateFormatter } from "react-aria";
import type { DateRangePickerProps as AriaDateRangePickerProps, DateValue } from "react-aria-components";
import { DateRangePicker as AriaDateRangePicker, Dialog as AriaDialog, Group as AriaGroup, Popover as AriaPopover, useLocale } from "react-aria-components";
import { Button, type ButtonProps } from "@/components/base/buttons/button";
import { InputDateBase } from "@/components/base/input/input-date";
import { cx } from "@/lib/utils/cx";
import { RangeCalendar, RangePresetButton } from "./range-calendar";

const now = today(getLocalTimeZone());

interface DateRangePickerProps extends AriaDateRangePickerProps<DateValue> {
    size?: ButtonProps["size"];
    /** The function to call when the apply button is clicked. */
    onApply?: () => void;
    /** The function to call when the cancel button is clicked. */
    onCancel?: () => void;
    buttonClassName?: string;
    placeholder?: string;
}

export const DateRangePicker = ({
    value: valueProp,
    defaultValue,
    onChange,
    onApply,
    onCancel,
    size = "sm",
    buttonClassName,
    placeholder = "Select dates",
    ...props
}: DateRangePickerProps) => {
    const { locale } = useLocale();
    const formatter = useDateFormatter({
        month: "short",
        day: "numeric",
        year: "numeric",
    });
    const [value, setValue] = useControlledState(valueProp, defaultValue || null, onChange);
    const [focusedValue, setFocusedValue] = useState<DateValue | null>(null);

    const formattedStartDate = value?.start ? formatter.format(value.start.toDate(getLocalTimeZone())) : null;
    const formattedEndDate = value?.end ? formatter.format(value.end.toDate(getLocalTimeZone())) : null;
    const formattedRange = formattedStartDate && formattedEndDate ? `${formattedStartDate} - ${formattedEndDate}` : placeholder;
    const presets = useMemo(
        () => ({
            today: { label: "Today", value: { start: now, end: now } },
            yesterday: { label: "Yesterday", value: { start: now.subtract({ days: 1 }), end: now.subtract({ days: 1 }) } },
            thisWeek: { label: "This week", value: { start: startOfWeek(now, locale), end: endOfWeek(now, locale) } },
            lastWeek: {
                label: "Last week",
                value: {
                    start: startOfWeek(now, locale).subtract({ weeks: 1 }),
                    end: endOfWeek(now, locale).subtract({ weeks: 1 }),
                },
            },
            thisMonth: { label: "This month", value: { start: startOfMonth(now), end: endOfMonth(now) } },
            lastMonth: {
                label: "Last month",
                value: {
                    start: startOfMonth(now).subtract({ months: 1 }),
                    end: endOfMonth(now).subtract({ months: 1 }),
                },
            },
            thisYear: { label: "This year", value: { start: startOfMonth(now.set({ month: 1 })), end: endOfMonth(now.set({ month: 12 })) } },
            lastYear: {
                label: "Last year",
                value: {
                    start: startOfMonth(now.set({ month: 1 }).subtract({ years: 1 })),
                    end: endOfMonth(now.set({ month: 12 }).subtract({ years: 1 })),
                },
            },
            allTime: {
                label: "All time",
                value: {
                    start: now.set({ year: 2000, month: 1, day: 1 }),
                    end: now,
                },
            },
        }),
        [locale],
    );

    return (
        <AriaDateRangePicker aria-label="Date range picker" shouldCloseOnSelect={false} {...props} value={value} onChange={setValue}>
            <AriaGroup>
                <Button
                    className={cx(
                        "border border-[rgba(15,23,42,0.12)] bg-white text-[color:var(--foreground)] shadow-none ring-0 hover:bg-[rgba(255,255,255,1)] hover:text-[color:var(--foreground)]",
                        buttonClassName,
                    )}
                    size={size}
                    color="secondary"
                    iconLeading={CalendarIcon}
                >
                    <span className="truncate">{formattedRange}</span>
                </Button>
            </AriaGroup>
            <AriaPopover
                placement="bottom right"
                offset={8}
                className={({ isEntering, isExiting }) =>
                    cx(
                        "origin-(--trigger-anchor-point) will-change-transform",
                        isEntering &&
                            "duration-150 ease-out animate-in fade-in placement-right:slide-in-from-left-0.5 placement-top:slide-in-from-bottom-0.5 placement-bottom:slide-in-from-top-0.5",
                        isExiting &&
                            "duration-100 ease-in animate-out fade-out placement-right:slide-out-to-left-0.5 placement-top:slide-out-to-bottom-0.5 placement-bottom:slide-out-to-top-0.5",
                    )
                }
            >
                <AriaDialog
                    aria-label="Date range picker"
                    className="overflow-hidden rounded-2xl border border-[rgba(15,23,42,0.12)] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] focus:outline-hidden"
                >
                    {({ close }) => (
                        <div className="flex bg-white">
                            <div className="hidden w-[138px] shrink-0 flex-col gap-1 border-r border-[rgba(15,23,42,0.08)] bg-white p-3 lg:flex">
                                {Object.values(presets).map((preset) => (
                                    <RangePresetButton
                                        key={preset.label}
                                        value={preset.value}
                                        onClick={() => {
                                            setValue(preset.value);
                                            setFocusedValue(preset.value.start);
                                        }}
                                    >
                                        {preset.label}
                                    </RangePresetButton>
                                ))}
                            </div>
                            <div className="flex flex-col bg-white">
                                <RangeCalendar
                                    focusedValue={focusedValue}
                                    onFocusChange={setFocusedValue}
                                    presets={{
                                        lastWeek: presets.lastWeek,
                                        lastMonth: presets.lastMonth,
                                        lastYear: presets.lastYear,
                                    }}
                                />
                                <div className="flex items-center justify-between gap-4 border-t border-[rgba(15,23,42,0.08)] bg-white p-4">
                                    <div className="hidden items-center gap-2 md:flex">
                                        <InputDateBase
                                            slot="start"
                                            size="sm"
                                            className="flex-1"
                                            wrapperClassName="border border-[rgba(15,23,42,0.12)] bg-white shadow-none ring-0"
                                        />
                                        <div className="text-md text-[rgba(15,23,42,0.4)]">-</div>
                                        <InputDateBase
                                            slot="end"
                                            size="sm"
                                            className="flex-1"
                                            wrapperClassName="border border-[rgba(15,23,42,0.12)] bg-white shadow-none ring-0"
                                        />
                                    </div>
                                    <div className="grid w-full grid-cols-2 gap-3 md:flex md:w-auto">
                                        <Button
                                            className="border border-[rgba(15,23,42,0.12)] bg-white text-[color:var(--foreground)] shadow-none ring-0 hover:bg-[rgba(15,23,42,0.04)] hover:text-[color:var(--foreground)]"
                                            size="md"
                                            color="secondary"
                                            onClick={() => {
                                                onCancel?.();
                                                close();
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            className="border-transparent bg-[#7c56d9] text-white shadow-none ring-0 hover:bg-[#6d46d0] hover:text-white"
                                            size="md"
                                            color="primary"
                                            onClick={() => {
                                                onApply?.();
                                                close();
                                            }}
                                        >
                                            Apply
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </AriaDialog>
            </AriaPopover>
        </AriaDateRangePicker>
    );
};
