"use client";

import type { ReactNode } from "react";
import type { SwitchProps as AriaSwitchProps } from "react-aria-components";
import { Switch as AriaSwitch } from "react-aria-components";
import { cx } from "@/lib/utils/cx";

interface ToggleBaseProps {
    size?: "sm" | "md";
    slim?: boolean;
    className?: string;
    isHovered?: boolean;
    isFocusVisible?: boolean;
    isSelected?: boolean;
    isDisabled?: boolean;
}

export const ToggleBase = ({ className, isHovered, isDisabled, isFocusVisible, isSelected, slim, size = "sm" }: ToggleBaseProps) => {
    const styles = {
        default: {
            sm: {
                root: "h-5 w-9 p-0.5",
                switch: cx("size-4", isSelected && "translate-x-4"),
            },
            md: {
                root: "h-6 w-11 p-0.5",
                switch: cx("size-5", isSelected && "translate-x-5"),
            },
        },
        slim: {
            sm: {
                root: "h-4 w-8",
                switch: cx("size-4", isSelected && "translate-x-4"),
            },
            md: {
                root: "h-5 w-10",
                switch: cx("size-5", isSelected && "translate-x-5"),
            },
        },
    };

    const classes = slim ? styles.slim[size] : styles.default[size];

    return (
        <div
            className={cx(
                "cursor-pointer rounded-full bg-white ring-1 ring-black/70 outline-focus-ring transition-[background-color,box-shadow] duration-150 ease-linear ring-inset",
                isSelected && "bg-[#2563eb] ring-white",
                isSelected && isHovered && "bg-[#1d4ed8]",
                isDisabled && "cursor-not-allowed opacity-50",
                isFocusVisible && "outline-2 outline-offset-2",

                classes.root,
                className,
            )}
        >
            <div
                style={{
                    transition: "transform 0.15s ease-in-out, translate 0.15s ease-in-out, border-color 0.1s linear, background-color 0.1s linear",
                }}
                className={cx(
                    "rounded-full bg-fg-white shadow-sm",

                    slim && "border border-black/70 shadow-xs",
                    slim && isSelected && "border-white",

                    classes.switch,
                )}
            />
        </div>
    );
};

const styles = {
    sm: {
        root: "gap-2",
        textWrapper: "",
        label: "text-sm font-medium",
        hint: "text-sm",
    },
    md: {
        root: "gap-3",
        textWrapper: "gap-0.5",
        label: "text-md font-medium",
        hint: "text-md",
    },
};

interface ToggleProps extends AriaSwitchProps {
    size?: "sm" | "md";
    label?: string;
    hint?: ReactNode;
    slim?: boolean;
}

export const Toggle = ({ label, hint, className, size = "sm", slim, ...ariaSwitchProps }: ToggleProps) => {
    return (
        <AriaSwitch
            {...ariaSwitchProps}
            className={(state) =>
                cx(
                    "flex w-max items-start",
                    state.isDisabled && "cursor-not-allowed",
                    styles[size].root,
                    typeof className === "function" ? className(state) : className,
                )
            }
        >
            {({ isSelected, isDisabled, isFocusVisible, isHovered }) => (
                <>
                    <ToggleBase
                        slim={slim}
                        size={size}
                        isHovered={isHovered}
                        isDisabled={isDisabled}
                        isFocusVisible={isFocusVisible}
                        isSelected={isSelected}
                        className={slim ? "mt-0.5" : ""}
                    />

                    {(label || hint) && (
                        <div className={cx("flex flex-col", styles[size].textWrapper)}>
                            {label && <p className={cx("text-secondary select-none", styles[size].label)}>{label}</p>}
                            {hint && (
                                <span className={cx("text-tertiary", styles[size].hint)} onClick={(event) => event.stopPropagation()}>
                                    {hint}
                                </span>
                            )}
                        </div>
                    )}
                </>
            )}
        </AriaSwitch>
    );
};
