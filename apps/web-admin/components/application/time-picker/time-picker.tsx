"use client";

import { useEffect, useRef } from "react";
import { Clock } from "@untitledui/icons";
import {
  Dialog as AriaDialog,
  DialogTrigger,
  Popover as AriaPopover,
} from "react-aria-components";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/lib/utils/cx";

const HOURS = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, "0"),
);
const MINUTES = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, "0"),
);

type TimePickerProps = {
  buttonClassName?: string;
  doneLabel?: string;
  isDisabled?: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

function readTime(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);

  if (!match) {
    return { hour: "00", minute: "00" };
  }

  const hour = Math.min(Math.max(Number(match[1]), 0), 23);
  const minute = Math.min(Math.max(Number(match[2]), 0), 59);

  return {
    hour: String(hour).padStart(2, "0"),
    minute: String(minute).padStart(2, "0"),
  };
}

export function TimePicker({
  buttonClassName,
  doneLabel = "Done",
  isDisabled = false,
  onChange,
  placeholder = "Select time",
  value,
}: TimePickerProps) {
  const selectedTime = readTime(value);
  const formattedTime = value || placeholder;
  const selectedHourRef = useRef<HTMLButtonElement | null>(null);
  const selectedMinuteRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    selectedHourRef.current?.scrollIntoView({ block: "center" });
    selectedMinuteRef.current?.scrollIntoView({ block: "center" });
  }, [selectedTime.hour, selectedTime.minute]);

  function updateTime(next: Partial<typeof selectedTime>) {
    const hour = next.hour ?? selectedTime.hour;
    const minute = next.minute ?? selectedTime.minute;
    onChange(`${hour}:${minute}`);
  }

  return (
    <DialogTrigger>
      <Button
        className={cx(
          "w-full justify-start rounded-[14px] border border-[rgba(15,23,42,0.12)] bg-white px-4 py-2.5 text-sm font-medium text-[color:var(--foreground)] shadow-none ring-0 hover:bg-white hover:text-[color:var(--foreground)]",
          buttonClassName,
        )}
        color="secondary"
        iconLeading={Clock}
        isDisabled={isDisabled}
        size="md"
      >
        <span className="tabular-nums">{formattedTime}</span>
      </Button>
      <AriaPopover
        className={({ isEntering, isExiting }) =>
          cx(
            "origin-(--trigger-anchor-point) will-change-transform",
            isEntering &&
              "duration-150 ease-out animate-in fade-in placement-bottom:slide-in-from-top-0.5 placement-top:slide-in-from-bottom-0.5",
            isExiting &&
              "duration-100 ease-in animate-out fade-out placement-bottom:slide-out-to-top-0.5 placement-top:slide-out-to-bottom-0.5",
          )
        }
        offset={8}
        placement="bottom left"
      >
        <AriaDialog className="overflow-hidden rounded-2xl border border-[rgba(15,23,42,0.12)] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
          {({ close }) => (
            <>
              <div className="grid w-[190px] grid-cols-2 gap-2 p-2">
                <div className="max-h-[240px] overflow-y-auto pr-1">
                  <div className="grid gap-1">
                    {HOURS.map((hour) => {
                      const isSelected = hour === selectedTime.hour;

                      return (
                        <button
                          aria-label={`Hour ${hour}`}
                          aria-pressed={isSelected}
                          className={cx(
                            "flex h-9 items-center justify-center rounded-xl text-sm font-semibold tabular-nums transition-[background-color,color,transform] duration-150 active:scale-[0.96]",
                            isSelected
                              ? "bg-[color:var(--accent)] text-white"
                              : "text-[color:var(--foreground)] hover:bg-[rgba(15,23,42,0.05)]",
                          )}
                          key={hour}
                          onClick={() => updateTime({ hour })}
                          ref={isSelected ? selectedHourRef : undefined}
                          type="button"
                        >
                          {hour}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="max-h-[240px] overflow-y-auto pl-1">
                  <div className="grid gap-1">
                    {MINUTES.map((minute) => {
                      const isSelected = minute === selectedTime.minute;

                      return (
                        <button
                          aria-label={`Minute ${minute}`}
                          aria-pressed={isSelected}
                          className={cx(
                            "flex h-9 items-center justify-center rounded-xl text-sm font-semibold tabular-nums transition-[background-color,color,transform] duration-150 active:scale-[0.96]",
                            isSelected
                              ? "bg-[color:var(--accent)] text-white"
                              : "text-[color:var(--foreground)] hover:bg-[rgba(15,23,42,0.05)]",
                          )}
                          key={minute}
                          onClick={() => updateTime({ minute })}
                          ref={isSelected ? selectedMinuteRef : undefined}
                          type="button"
                        >
                          {minute}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="border-t border-[rgba(15,23,42,0.08)] bg-white p-2">
                <Button
                  className="w-full border-transparent bg-[color:var(--accent)] text-white shadow-none ring-0 hover:bg-[color:var(--accent)] hover:text-white"
                  color="primary"
                  onClick={close}
                  size="sm"
                >
                  {doneLabel}
                </Button>
              </div>
            </>
          )}
        </AriaDialog>
      </AriaPopover>
    </DialogTrigger>
  );
}
