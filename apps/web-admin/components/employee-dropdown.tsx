"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, Users } from "lucide-react";
import { WorkspaceLoading } from "@/components/workspace-loading";
import { SelectOptionAvatar } from "@/components/ui/select";
import { SelectableOptionButton } from "@/components/ui/selectable-listbox";
import { cn } from "@/lib/utils";

export type EmployeeDropdownOption = {
  avatarUrl?: string | null;
  displayName?: string;
  employeeNumber?: string | null;
  firstName?: string | null;
  id: string;
  lastName?: string | null;
  middleName?: string | null;
  name?: string;
  position?: { name?: string | null } | string | null;
  roleLabel?: string | null;
  user?: { email?: string | null; id?: string } | null;
};

type EmployeeDropdownProps = {
  allEmployeesLabel: string;
  allOptionBehavior?: "empty" | "select-all";
  buttonClassName?: string;
  className?: string;
  disabled?: boolean;
  employeeLabel: string;
  employees: EmployeeDropdownOption[];
  isLoading?: boolean;
  loadingLabel: string;
  mode: "single" | "multiple";
  noEmployeesLabel: string;
  onSelectedEmployeeIdsChange: (employeeIds: string[]) => void;
  placeholder: string;
  searchPlaceholder: string;
  selectedEmployeeIds: string[];
  selectedEmployeesLabel: (count: number) => string;
  showAllEmployeesOption?: boolean;
};

function getEmployeeName(employee: EmployeeDropdownOption) {
  return (
    employee.displayName ||
    employee.name ||
    [employee.lastName, employee.firstName, employee.middleName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    employee.user?.email ||
    employee.employeeNumber ||
    employee.id
  );
}

function getEmployeeSubtitle(
  employee: EmployeeDropdownOption,
  employeeLabel: string,
) {
  const position =
    typeof employee.position === "string"
      ? employee.position
      : employee.position?.name;
  const primary = position || employee.roleLabel || employeeLabel;
  const secondary = employee.employeeNumber || employee.user?.email;

  return secondary ? `${primary} · ${secondary}` : primary;
}

export function EmployeeDropdown({
  allEmployeesLabel,
  allOptionBehavior = "select-all",
  buttonClassName,
  className,
  disabled = false,
  employeeLabel,
  employees,
  isLoading = false,
  loadingLabel,
  mode,
  noEmployeesLabel,
  onSelectedEmployeeIdsChange,
  placeholder,
  searchPlaceholder,
  selectedEmployeeIds,
  selectedEmployeesLabel,
  showAllEmployeesOption = true,
}: EmployeeDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedIds = useMemo(
    () => new Set(selectedEmployeeIds.filter(Boolean)),
    [selectedEmployeeIds],
  );
  const allSelected =
    employees.length > 0 && employees.every((employee) => selectedIds.has(employee.id));
  const allOptionSelected =
    showAllEmployeesOption &&
    (allOptionBehavior === "empty" ? selectedEmployeeIds.length === 0 : allSelected);

  const selectedEmployees = useMemo(
    () => employees.filter((employee) => selectedIds.has(employee.id)),
    [employees, selectedIds],
  );

  const buttonLabel =
    allOptionSelected
      ? allEmployeesLabel
      : selectedEmployees.length === 0
        ? placeholder
        : selectedEmployees.length === 1
          ? getEmployeeName(selectedEmployees[0])
          : selectedEmployeesLabel(selectedEmployees.length);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredEmployees = normalizedQuery
    ? employees.filter((employee) => {
        const name = getEmployeeName(employee);
        const subtitle = getEmployeeSubtitle(employee, employeeLabel);
        return `${name} ${subtitle}`.toLowerCase().includes(normalizedQuery);
      })
    : employees;

  useEffect(() => {
    if (!open) {
      return;
    }

    function isInsideDropdown(event: Event) {
      const root = containerRef.current;
      if (!root) return false;

      if (typeof event.composedPath === "function") {
        return event.composedPath().includes(root);
      }

      const target = event.target;
      return target instanceof Node && root.contains(target);
    }

    function closeOnOutsideInteraction(event: Event) {
      if (isInsideDropdown(event)) {
        return;
      }

      setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideInteraction, true);
    document.addEventListener("mousedown", closeOnOutsideInteraction, true);
    document.addEventListener("touchstart", closeOnOutsideInteraction, true);
    document.addEventListener("focusin", closeOnOutsideInteraction, true);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideInteraction, true);
      document.removeEventListener("mousedown", closeOnOutsideInteraction, true);
      document.removeEventListener("touchstart", closeOnOutsideInteraction, true);
      document.removeEventListener("focusin", closeOnOutsideInteraction, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  function selectAllEmployees() {
    onSelectedEmployeeIdsChange(
      allOptionBehavior === "empty"
        ? []
        : employees.map((employee) => employee.id),
    );
    if (mode === "single") {
      setOpen(false);
    }
  }

  function selectEmployee(employeeId: string) {
    if (mode === "single") {
      onSelectedEmployeeIdsChange([employeeId]);
      setOpen(false);
      return;
    }

    if (selectedIds.has(employeeId)) {
      onSelectedEmployeeIdsChange(
        selectedEmployeeIds.filter((id) => id !== employeeId),
      );
      return;
    }

    onSelectedEmployeeIdsChange([...selectedEmployeeIds, employeeId]);
  }

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <button
        aria-expanded={open}
        className={cn(
          "group inline-flex min-h-11 w-full items-center justify-between gap-3 rounded-[20px] border border-[rgba(24,24,27,0.12)] bg-white px-3 py-1 text-left text-sm font-medium text-foreground shadow-[0_0_0_0_rgba(15,23,42,0.04)] transition-[box-shadow,background-color] duration-200 hover:bg-white hover:shadow-[0_0_0_4px_rgba(15,23,42,0.04)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-60",
          buttonClassName,
        )}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span
          className={cn(
            "min-w-0 truncate",
            selectedEmployees.length > 0 || allOptionSelected
              ? "text-foreground"
              : "text-muted-foreground",
          )}
        >
          {buttonLabel}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-[rgba(72,84,104,0.72)] transition-transform duration-200",
            open ? "rotate-180" : "",
          )}
        />
      </button>

      {open ? (
        <div
          aria-multiselectable={mode === "multiple"}
          className="absolute left-0 right-0 z-50 mt-1 max-h-[min(384px,76vh)] overflow-y-auto rounded-[26px] border border-[rgba(24,24,27,0.12)] bg-white/98 p-2 shadow-[0_22px_54px_rgba(15,23,42,0.16)] backdrop-blur-sm"
          role="listbox"
        >
          <div className="sticky top-0 z-10 mb-2 bg-white/98 pb-2">
            <label className="flex min-h-10 items-center gap-2 rounded-[18px] border border-[rgba(24,24,27,0.1)] bg-[rgba(246,247,251,0.92)] px-3">
              <Search className="size-4 shrink-0 text-[rgba(72,84,104,0.58)]" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                value={query}
              />
            </label>
          </div>

          {isLoading ? (
            <WorkspaceLoading
              className="min-h-[124px]"
              iconClassName="size-8"
              label={loadingLabel}
            />
          ) : employees.length ? (
            <>
              {showAllEmployeesOption ? (
                <>
                  <SelectableOptionButton
                    closeOnSelected={false}
                    onClose={() => setOpen(false)}
                    onSelect={selectAllEmployees}
                    selected={allOptionSelected}
                  >
                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[rgba(227,231,239,0.78)] text-[rgba(72,84,104,0.72)]">
                      <Users className="size-4" />
                    </span>
                    <span className="grid min-w-0 gap-0.5">
                      <span className="truncate text-sm font-semibold leading-[1.2] text-current">
                        {allEmployeesLabel}
                      </span>
                      <span
                        className={cn(
                          "truncate text-xs leading-[1.25]",
                          allOptionSelected ? "text-white/75" : "text-[rgba(72,84,104,0.72)]",
                        )}
                      >
                        {selectedEmployeesLabel(employees.length)}
                      </span>
                    </span>
                    {allOptionSelected ? (
                      <Check className="absolute right-3 size-4 text-white" />
                    ) : null}
                  </SelectableOptionButton>

                  <div className="my-2 h-px bg-[rgba(15,23,42,0.08)]" />
                </>
              ) : null}

              {filteredEmployees.length ? (
                filteredEmployees.map((employee) => {
                  const label = getEmployeeName(employee);
                  const isSelected = selectedIds.has(employee.id);

                  return (
                    <SelectableOptionButton
                      closeOnSelected={false}
                      key={employee.id}
                      onClose={() => setOpen(false)}
                      onSelect={() => selectEmployee(employee.id)}
                      selected={isSelected}
                    >
                      <SelectOptionAvatar
                        alt={label}
                        seed={label || employee.id}
                        src={employee.avatarUrl ?? null}
                      />
                      <span className="grid min-w-0 gap-0.5">
                        <span className="truncate text-sm font-semibold leading-[1.2] text-current">
                          {label}
                        </span>
                        <span
                          className={cn(
                            "truncate text-xs leading-[1.25]",
                            isSelected
                              ? "text-white/75"
                              : "text-[rgba(72,84,104,0.72)]",
                          )}
                        >
                          {getEmployeeSubtitle(employee, employeeLabel)}
                        </span>
                      </span>
                      {isSelected ? (
                        <Check className="absolute right-3 size-4 text-white" />
                      ) : null}
                    </SelectableOptionButton>
                  );
                })
              ) : (
                <div className="px-3 py-6 text-center text-sm font-medium text-[color:var(--muted-foreground)]">
                  {noEmployeesLabel}
                </div>
              )}
            </>
          ) : (
            <div className="px-3 py-6 text-center text-sm font-medium text-[color:var(--muted-foreground)]">
              {noEmployeesLabel}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
