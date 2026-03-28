"use client";

import { getLocalTimeZone, today } from "@internationalized/date";
import { useControlledState } from "@react-stately/utils";
import { Calendar as CalendarIcon } from "@untitledui/icons";
import { useDateFormatter } from "react-aria";
import type { DatePickerProps as AriaDatePickerProps, DateValue } from "react-aria-components";
import { DatePicker as AriaDatePicker, Dialog as AriaDialog, Group as AriaGroup, Popover as AriaPopover } from "react-aria-components";
import { Button, type ButtonProps } from "@/components/base/buttons/button";
import { cx } from "@/lib/utils/cx";
import { Calendar } from "./calendar";

const highlightedDates = [today(getLocalTimeZone())];

interface DatePickerProps extends AriaDatePickerProps<DateValue> {
    /** The function to call when the apply button is clicked. */
    onApply?: () => void;
    /** The function to call when the cancel button is clicked. */
    onCancel?: () => void;
    size?: ButtonProps["size"];
    buttonClassName?: string;
    placeholder?: string;
}

export const DatePicker = ({
    value: valueProp,
    defaultValue,
    onChange,
    onApply,
    onCancel,
    size = "sm",
    buttonClassName,
    placeholder = "Select date",
    ...props
}: DatePickerProps) => {
    const formatter = useDateFormatter({
        month: "short",
        day: "numeric",
        year: "numeric",
    });
    const [value, setValue] = useControlledState(valueProp, defaultValue || null, onChange);

    const formattedDate = value ? formatter.format(value.toDate(getLocalTimeZone())) : placeholder;

    return (
            <AriaDatePicker aria-label="Date picker" shouldCloseOnSelect={false} {...props} value={value} onChange={setValue}>
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
                    {formattedDate}
                </Button>
            </AriaGroup>
            <AriaPopover
                offset={8}
                placement="bottom right"
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
                    aria-label="Date picker"
                    className="overflow-hidden rounded-2xl border border-[rgba(15,23,42,0.12)] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
                >
                    {({ close }) => (
                        <>
                            <div className="flex bg-white px-6 py-5">
                                <Calendar highlightedDates={highlightedDates} />
                            </div>
                            <div className="grid grid-cols-2 gap-3 border-t border-[rgba(15,23,42,0.08)] bg-white p-4">
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
                        </>
                    )}
                </AriaDialog>
            </AriaPopover>
        </AriaDatePicker>
    );
};
