"use client";

import type {
  EmployeeAccessRole,
  EmployeesBootstrapResponse,
  InvitationRecord,
  WorkGroupItem,
} from "@smart/types";
import { ArrowRight, Crown, Mail, UserRound, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InvitationDeliveryDialog } from "@/components/invitation-delivery-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/api";
import type { AuthSession } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

type HeaderEmployeeCreateDialogProps = {
  onCreated?: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  session: AuthSession | null;
};

const EMPLOYEE_ACCESS_ROLES: Array<{
  value: EmployeeAccessRole;
  titleRu: string;
  titleEn: string;
  descriptionRu: string;
  descriptionEn: string;
}> = [
  {
    value: "owner",
    titleRu: "Владелец",
    titleEn: "Owner",
    descriptionRu: "Полный доступ ко всем сотрудникам, бригадам и настройкам.",
    descriptionEn: "Full access to employees, teams, and workspace settings.",
  },
  {
    value: "team_leader",
    titleRu: "Лидер бригады",
    titleEn: "Team leader",
    descriptionRu: "Управляет задачами и посещаемостью своей бригады.",
    descriptionEn: "Manages tasks and attendance for one assigned team.",
  },
  {
    value: "employee",
    titleRu: "Сотрудник",
    titleEn: "Employee",
    descriptionRu: "Видит свои смены, задачи, посещаемость и профиль.",
    descriptionEn: "Sees own shifts, tasks, attendance, and profile.",
  },
];

function localize(locale: "ru" | "en", ru: string, en: string) {
  return locale === "ru" ? ru : en;
}

function getRoleIcon(role: EmployeeAccessRole) {
  if (role === "owner") {
    return Crown;
  }

  if (role === "team_leader") {
    return UsersRound;
  }

  return UserRound;
}

function getRoleLabel(role: EmployeeAccessRole, locale: "ru" | "en") {
  const option = EMPLOYEE_ACCESS_ROLES.find((item) => item.value === role);
  return option ? localize(locale, option.titleRu, option.titleEn) : role;
}

function isBillingSeatLimitMessage(message: string) {
  return /оплаченных мест|billing|paid seats|seat/i.test(message);
}

export function HeaderEmployeeCreateDialog({
  onCreated,
  onOpenChange,
  open,
  session,
}: HeaderEmployeeCreateDialogProps) {
  const { locale } = useI18n();
  const [step, setStep] = useState<1 | 2>(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [positionTitle, setPositionTitle] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<EmployeeAccessRole>("employee");
  const [assignTeam, setAssignTeam] = useState(false);
  const [teamId, setTeamId] = useState("__none");
  const [groups, setGroups] = useState<WorkGroupItem[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdInvitation, setCreatedInvitation] =
    useState<InvitationRecord | null>(null);

  const sortedGroups = useMemo(
    () => [...groups].sort((left, right) => left.name.localeCompare(right.name, locale)),
    [groups, locale],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setStep(1);
    setFirstName("");
    setLastName("");
    setPositionTitle("");
    setEmail("");
    setRole("employee");
    setAssignTeam(false);
    setTeamId("__none");
    setError(null);
    setCreatedInvitation(null);

    if (!session?.accessToken) {
      return;
    }

    let cancelled = false;
    setLoadingGroups(true);

    void apiRequest<EmployeesBootstrapResponse>("/bootstrap/employees", {
      token: session.accessToken,
      skipClientCache: true,
    })
      .then((snapshot) => {
        if (!cancelled) {
          setGroups(snapshot.groups ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGroups([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingGroups(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, session?.accessToken]);

  function validateStepOne() {
    if (!firstName.trim() || !lastName.trim()) {
      return localize(
        locale,
        "Укажите имя и фамилию сотрудника.",
        "Enter the employee first and last name.",
      );
    }

    if (!positionTitle.trim()) {
      return localize(
        locale,
        "Укажите должность сотрудника.",
        "Enter the employee position.",
      );
    }

    if (!email.trim()) {
      return localize(locale, "Введите email сотрудника.", "Enter the employee email.");
    }

    return null;
  }

  function goNext() {
    const validationError = validateStepOne();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);

    if (role === "owner") {
      void handleSubmit();
      return;
    }

    setStep(2);
  }

  async function handleSubmit() {
    if (!session?.accessToken) {
      return;
    }

    const validationError = validateStepOne();

    if (validationError) {
      setStep(1);
      setError(validationError);
      return;
    }

    const selectedTeamId = teamId === "__none" ? "" : teamId;
    const shouldSendTeam = role === "team_leader" || (role === "employee" && assignTeam);

    if (role === "team_leader" && !selectedTeamId) {
      setStep(2);
      setError(
        localize(
          locale,
          "Лидеру нужно выбрать бригаду.",
          "Select a team for the leader.",
        ),
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const invitation = await apiRequest<InvitationRecord>("/employees/invitations", {
        method: "POST",
        token: session.accessToken,
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          positionTitle: positionTitle.trim(),
          role,
          teamId: shouldSendTeam ? selectedTeamId : undefined,
        }),
      });

      setCreatedInvitation(invitation);
      onOpenChange(false);
      onCreated?.();
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : localize(locale, "Не удалось отправить приглашение.", "Failed to send invite.");

      setError(
        isBillingSeatLimitMessage(message)
          ? localize(
              locale,
              "Не хватает оплаченных мест. Добавьте место в Billing перед приглашением сотрудника.",
              "Not enough paid seats. Add a seat in Billing before inviting an employee.",
            )
          : message,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[calc(100vh-2rem)] w-[min(760px,calc(100vw-1.5rem))] max-w-none overflow-y-auto rounded-[28px] border-[color:var(--border)] bg-[color:var(--panel-strong)] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">
            {localize(locale, "Добавить сотрудника", "Add employee")}
          </DialogTitle>
          <DialogDescription className="font-heading">
            {localize(
              locale,
              "Шаг 1 — данные и роль. Шаг 2 — бригада, если она нужна для выбранной роли.",
              "Step 1 is profile and role. Step 2 is team assignment when the selected role needs it.",
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-[color:var(--accent)] transition-all"
              style={{ width: step === 1 ? "50%" : "100%" }}
            />
          </div>
          <div className="flex items-center justify-between text-xs font-heading font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span>{localize(locale, `Шаг ${step} из 2`, `Step ${step} of 2`)}</span>
            <span>
              {step === 1
                ? localize(locale, "Данные и роль", "Profile and role")
                : localize(locale, "Бригада", "Team")}
            </span>
          </div>

          {step === 1 ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-heading">
                  <span>{localize(locale, "Имя", "First name")}</span>
                  <Input
                    onChange={(event) => setFirstName(event.target.value)}
                    value={firstName}
                  />
                </label>
                <label className="grid gap-2 text-sm font-heading">
                  <span>{localize(locale, "Фамилия", "Last name")}</span>
                  <Input
                    onChange={(event) => setLastName(event.target.value)}
                    value={lastName}
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm font-heading">
                <span>{localize(locale, "Должность", "Position")}</span>
                <Input
                  onChange={(event) => setPositionTitle(event.target.value)}
                  placeholder={localize(locale, "Например, Бариста", "For example, Barista")}
                  value={positionTitle}
                />
              </label>

              <label className="grid gap-2 text-sm font-heading">
                <span>{localize(locale, "Рабочий email", "Work email")}</span>
                <Input
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="employee@company.com"
                  type="email"
                  value={email}
                />
              </label>

              <div className="grid gap-2 text-sm font-heading">
                <span>{localize(locale, "Роль", "Role")}</span>
                <div className="grid gap-2 sm:grid-cols-3">
                  {EMPLOYEE_ACCESS_ROLES.map((roleOption) => {
                    const selected = role === roleOption.value;
                    const Icon = getRoleIcon(roleOption.value);

                    return (
                      <button
                        className={`min-h-[132px] rounded-2xl border p-3 text-left transition ${
                          selected
                            ? "border-[color:var(--accent)] bg-[rgba(49,84,255,0.08)]"
                            : "border-border bg-secondary/20 hover:bg-white"
                        }`}
                        key={roleOption.value}
                        onClick={() => {
                          setRole(roleOption.value);
                          if (roleOption.value === "owner") {
                            setAssignTeam(false);
                            setTeamId("__none");
                          }
                          setError(null);
                        }}
                        type="button"
                      >
                        <Icon className="mb-3 h-5 w-5 text-[color:var(--accent)]" />
                        <span className="block font-semibold text-foreground">
                          {localize(locale, roleOption.titleRu, roleOption.titleEn)}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                          {localize(locale, roleOption.descriptionRu, roleOption.descriptionEn)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {role === "employee" ? (
                <label className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/20 p-4 text-sm font-heading">
                  <Checkbox
                    checked={assignTeam}
                    onCheckedChange={(checked) => setAssignTeam(checked === true)}
                  />
                  <span className="grid gap-1">
                    <span className="font-semibold text-foreground">
                      {localize(locale, "Назначить сотрудника в бригаду", "Assign employee to a team")}
                    </span>
                    <span className="text-xs leading-5 text-muted-foreground">
                      {localize(
                        locale,
                        "Можно оставить без бригады и назначить позже из списка сотрудников.",
                        "You can leave this blank and assign a team later from the employee list.",
                      )}
                    </span>
                  </span>
                </label>
              ) : null}

              {role === "team_leader" || assignTeam ? (
                <label className="grid gap-2 text-sm font-heading">
                  <span>
                    {role === "team_leader"
                      ? localize(locale, "Бригада лидера", "Leader team")
                      : localize(locale, "Бригада", "Team")}
                  </span>
                  <Select onValueChange={setTeamId} value={teamId}>
                    <SelectTrigger className="h-11 rounded-xl border-border bg-secondary/30 text-sm font-heading">
                      <SelectValue
                        placeholder={
                          loadingGroups
                            ? localize(locale, "Загружаем бригады...", "Loading teams...")
                            : localize(locale, "Выберите бригаду", "Select team")
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem disabled={role === "team_leader"} value="__none">
                        {localize(locale, "Без бригады", "No team")}
                      </SelectItem>
                      {sortedGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.avatarEmoji ? `${group.avatarEmoji} ` : ""}
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              ) : (
                <p className="px-1 text-sm font-heading text-muted-foreground">
                  {localize(
                    locale,
                    "Сотрудник будет без бригады. Назначить можно позже.",
                    "The employee will have no team. You can assign one later.",
                  )}
                </p>
              )}
            </div>
          )}

          {error ? <div className="error-box">{error}</div> : null}

          <div className="flex flex-wrap justify-end gap-3">
            <Button
              className="rounded-xl font-heading"
              onClick={() => {
                if (step === 1) {
                  onOpenChange(false);
                  return;
                }

                setStep(1);
                setError(null);
              }}
              type="button"
              variant="outline"
            >
              {step === 1 ? localize(locale, "Отмена", "Cancel") : localize(locale, "Назад", "Back")}
            </Button>
            <Button
              className="rounded-xl font-heading"
              disabled={submitting}
              onClick={() => (step === 1 ? goNext() : void handleSubmit())}
              type="button"
            >
              {step === 1 ? <ArrowRight className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
              {submitting
                ? localize(locale, "Отправляем...", "Sending...")
                : step === 1
                  ? role === "owner"
                    ? localize(locale, "Отправить", "Send")
                    : localize(locale, "Далее", "Next")
                  : localize(locale, "Отправить приглашение", "Send invite")}
            </Button>
          </div>

          {step === 1 ? null : (
            <p className="text-xs font-heading text-muted-foreground">
              {localize(locale, "Выбранная роль", "Selected role")}:{" "}
              <span className="font-semibold text-foreground">
                {getRoleLabel(role, locale)}
              </span>
            </p>
          )}
        </div>
      </DialogContent>
      </Dialog>
      <InvitationDeliveryDialog
        invitation={createdInvitation}
        locale={locale}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setCreatedInvitation(null);
        }}
      />
    </>
  );
}
