"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import {
  EmployeeRequestItem,
  MyTimeOffBalancesResponse,
  RequestType,
  RequestsCalendarResponse,
  TaskItem,
} from "@smart/types";
import { EmployeeShell } from "../../../components/employee-shell";
import { getSession } from "../../../lib/auth";
import { apiRequest } from "../../../lib/api";
import { useI18n } from "../../../lib/i18n";
import { parseTaskMeta } from "../../../lib/task-meta";

const requestTypeOptions: RequestType[] = [
  "LEAVE",
  "VACATION_CHANGE",
  "SICK_LEAVE",
  "UNPAID_LEAVE",
  "GENERAL",
  "SHIFT_CHANGE",
  "ADVANCE",
  "SUPPLY",
];

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthBounds(viewDate: Date) {
  const dateFrom = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const dateTo = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
  return {
    dateFrom,
    dateTo,
  };
}

function formatRequestType(
  type: RequestType,
  t: ReturnType<typeof useI18n>["t"],
) {
  switch (type) {
    case "LEAVE":
      return t("requests.leave");
    case "VACATION_CHANGE":
      return t("requests.vacationChange");
    case "SICK_LEAVE":
      return t("requests.sickLeave");
    case "UNPAID_LEAVE":
      return t("requests.unpaidLeave");
    case "SHIFT_CHANGE":
      return t("requests.shiftChange");
    case "ADVANCE":
      return t("requests.advance");
    case "SUPPLY":
      return t("requests.supply");
    default:
      return t("requests.general");
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(new Error(`Unable to read file ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

function parseTaskDueKey(task: TaskItem) {
  return task.dueAt ? task.dueAt.slice(0, 10) : null;
}

type CalendarRequestEvent = {
  kind: "request";
  id: string;
  request: EmployeeRequestItem;
};

type CalendarTaskEvent = {
  kind: "task";
  id: string;
  task: TaskItem;
};

type CalendarEvent = CalendarRequestEvent | CalendarTaskEvent;

export default function EmployeeRequestsPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<EmployeeRequestItem[]>([]);
  const [balances, setBalances] = useState<MyTimeOffBalancesResponse | null>(
    null,
  );
  const [calendar, setCalendar] = useState<RequestsCalendarResponse | null>(
    null,
  );
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequestType, setSelectedRequestType] =
    useState<RequestType>("LEAVE");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDayKey, setSelectedDayKey] = useState(() =>
    formatDateKey(new Date()),
  );

  async function loadData(viewDate = calendarMonth) {
    const session = getSession();
    if (!session) return;

    const { dateFrom, dateTo } = getMonthBounds(viewDate);
    const [requestItems, balanceSummary, calendarResponse, myTasks] =
      await Promise.all([
        apiRequest<EmployeeRequestItem[]>("/requests/me", {
          token: session.accessToken,
        }),
        apiRequest<MyTimeOffBalancesResponse>("/requests/me/balances", {
          token: session.accessToken,
        }),
        apiRequest<RequestsCalendarResponse>(
          `/requests/me/calendar?dateFrom=${dateFrom.toISOString()}&dateTo=${dateTo.toISOString()}`,
          { token: session.accessToken },
        ),
        apiRequest<TaskItem[]>("/collaboration/tasks/me", {
          token: session.accessToken,
        }),
      ]);

    setItems(requestItems);
    setBalances(balanceSummary);
    setCalendar(calendarResponse);
    setTasks(myTasks);
  }

  useEffect(() => {
    void loadData();
  }, [calendarMonth]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) return;

    setError(null);
    setMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const selectedRelatedRequestId = String(
      formData.get("relatedRequestId") ?? "",
    );
    const relatedRequest = items.find(
      (item) => item.id === selectedRelatedRequestId,
    );
    const files = Array.from(
      (form.elements.namedItem("attachments") as HTMLInputElement | null)
        ?.files ?? [],
    );
    const attachments = await Promise.all(
      files.map(async (file) => ({
        fileName: file.name,
        dataUrl: await readFileAsDataUrl(file),
      })),
    );

    try {
      await apiRequest("/requests", {
        method: "POST",
        token: session.accessToken,
        body: JSON.stringify({
          requestType: selectedRequestType,
          title: formData.get("title"),
          reason: formData.get("reason"),
          startsOn: formData.get("startsOn"),
          endsOn: formData.get("endsOn"),
          relatedRequestId:
            selectedRequestType === "VACATION_CHANGE"
              ? selectedRelatedRequestId
              : undefined,
          previousStartsOn: relatedRequest?.startsOn,
          previousEndsOn: relatedRequest?.endsOn,
          attachments,
        }),
      });

      form.reset();
      setSelectedRequestType("LEAVE");
      setMessage(t("employeePortal.requestCreated"));
      await loadData();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : t("common.error"),
      );
    }
  }

  async function addComment(
    requestId: string,
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    const session = getSession();
    if (!session) return;

    const formData = new FormData(event.currentTarget);
    const body = String(formData.get("body") ?? "").trim();
    if (!body) return;

    await apiRequest(`/requests/${requestId}/comments`, {
      method: "POST",
      token: session.accessToken,
      body: JSON.stringify({ body }),
    });

    event.currentTarget.reset();
    setMessage(t("requests.commentAdded"));
    await loadData();
  }

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter") {
      event.stopPropagation();
    }
  }

  const approvedVacations = items.filter(
    (item) => item.requestType === "LEAVE" && item.status === "APPROVED",
  );
  const monthDays: Date[] = [];
  const { dateFrom } = getMonthBounds(calendarMonth);
  const calendarStart = new Date(dateFrom);
  calendarStart.setDate(dateFrom.getDate() - ((dateFrom.getDay() + 6) % 7));

  for (let index = 0; index < 42; index += 1) {
    const day = new Date(calendarStart);
    day.setDate(calendarStart.getDate() + index);
    monthDays.push(day);
  }

  const calendarEventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();

    for (const request of calendar?.requests ?? []) {
      const startsOn = request.startsOn.slice(0, 10);
      const endsOn = request.endsOn.slice(0, 10);

      for (const day of monthDays) {
        const dayKey = formatDateKey(day);
        if (dayKey < startsOn || dayKey > endsOn) continue;

        const dayEvents = map.get(dayKey) ?? [];
        dayEvents.push({
          kind: "request",
          id: `request-${request.id}`,
          request,
        });
        map.set(dayKey, dayEvents);
      }
    }

    for (const task of tasks) {
      const dueKey = parseTaskDueKey(task);
      if (!dueKey) continue;

      const dayEvents = map.get(dueKey) ?? [];
      dayEvents.push({
        kind: "task",
        id: `task-${task.id}`,
        task,
      });
      map.set(dueKey, dayEvents);
    }

    return map;
  }, [calendar?.requests, monthDays, tasks]);

  const selectedDayEvents = calendarEventsByDay.get(selectedDayKey) ?? [];

  function shiftCalendarMonth(delta: number) {
    const nextMonth = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth() + delta,
      1,
    );
    setCalendarMonth(nextMonth);
    setSelectedDayKey(formatDateKey(nextMonth));
  }

  return (
    <EmployeeShell>
      <section className="section-stack">
        <section className="section-header">
          <span className="eyebrow">{t("employeePortal.openRequests")}</span>
          <h1>{t("requests.employeeTitle")}</h1>
          <p>{t("requests.employeeSubtitle")}</p>
        </section>

        {message ? <div className="inline-note">{message}</div> : null}
        {error ? <div className="inline-note">{error}</div> : null}

        <section className="employee-grid">
          <article className="panel">
            <div className="panel-header">
              <div>
                <span className="section-kicker">
                  {t("requests.balanceTitle")}
                </span>
                <h2>{t("requests.balanceSubtitle")}</h2>
              </div>
            </div>
            <div className="section-stack compact-stack">
              {balances?.balances.map((balance) => (
                <article className="mini-panel" key={balance.kind}>
                  <div className="panel-header">
                    <div>
                      <span className="section-kicker">{balance.kind}</span>
                      <h3>
                        {balance.kind === "VACATION"
                          ? t("requests.leave")
                          : t("requests.personalDayOff")}
                      </h3>
                    </div>
                    <strong>{balance.availableDays}</strong>
                  </div>
                  <div className="detail-list">
                    <div className="detail-row">
                      <span>{t("requests.allowanceDays")}</span>
                      <strong>{balance.allowanceDays}</strong>
                    </div>
                    <div className="detail-row">
                      <span>{t("requests.pendingDays")}</span>
                      <strong>{balance.pendingDays}</strong>
                    </div>
                    <div className="detail-row">
                      <span>{t("requests.usedDays")}</span>
                      <strong>{balance.usedDays}</strong>
                    </div>
                  </div>
                </article>
              ))}
              <article className="mini-panel">
                <span className="section-kicker">
                  {t("requests.sickLeave")}
                </span>
                <h3>{t("requests.sickLeaveStats")}</h3>
                <div className="detail-list">
                  <div className="detail-row">
                    <span>{t("requests.totalRequests")}</span>
                    <strong>{balances?.sickLeave.approvedRequests ?? 0}</strong>
                  </div>
                  <div className="detail-row">
                    <span>{t("requests.totalDays")}</span>
                    <strong>{balances?.sickLeave.approvedDays ?? 0}</strong>
                  </div>
                </div>
              </article>
            </div>
          </article>

          <article className="panel panel-large">
            <div className="panel-header">
              <div>
                <span className="section-kicker">
                  {t("requests.createTitle")}
                </span>
                <h2>{t("requests.submit")}</h2>
              </div>
            </div>
            <form
              className="form-grid"
              onSubmit={(event) => void handleSubmit(event)}
            >
              <select
                name="requestType"
                onChange={(event) =>
                  setSelectedRequestType(event.target.value as RequestType)
                }
                required
                value={selectedRequestType}
              >
                {requestTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {formatRequestType(type, t)}
                  </option>
                ))}
              </select>
              {selectedRequestType === "VACATION_CHANGE" ? (
                <select name="relatedRequestId" required>
                  <option value="">
                    {t("requests.selectOriginalVacation")}
                  </option>
                  {approvedVacations.map((item) => (
                    <option key={item.id} value={item.id}>
                      {new Date(item.startsOn).toLocaleDateString()} -{" "}
                      {new Date(item.endsOn).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              ) : null}
              <input
                name="title"
                placeholder={t("requests.titleField")}
                required
              />
              <input name="startsOn" required type="date" />
              <input name="endsOn" required type="date" />
              <textarea
                name="reason"
                onKeyDown={handleTextareaKeyDown}
                placeholder={t("requests.reasonDetailed")}
                rows={4}
              />
              <label className="field-shell">
                <span className="section-kicker">
                  {t("requests.attachments")}
                </span>
                <input
                  accept="image/*,.pdf,.doc,.docx"
                  multiple
                  name="attachments"
                  type="file"
                />
              </label>
              <button className="solid-button" type="submit">
                {t("requests.submit")}
              </button>
            </form>
          </article>
        </section>

        <section className="employee-grid">
          <article className="panel panel-large">
            <div className="panel-header">
              <div>
                <span className="section-kicker">
                  {t("requests.workspaceCalendarTitle")}
                </span>
                <h2>
                  {calendarMonth.toLocaleDateString(undefined, {
                    month: "long",
                    year: "numeric",
                  })}
                </h2>
                <p>{t("requests.workspaceCalendarSubtitle")}</p>
              </div>
              <div className="action-row">
                <button
                  className="ghost-button"
                  onClick={() => shiftCalendarMonth(-1)}
                  type="button"
                >
                  {t("common.previous")}
                </button>
                <button
                  className="ghost-button"
                  onClick={() => shiftCalendarMonth(1)}
                  type="button"
                >
                  {t("common.next")}
                </button>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                gap: 8,
              }}
            >
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                (label) => (
                  <div
                    className="section-kicker"
                    key={label}
                    style={{ textAlign: "center" }}
                  >
                    {label}
                  </div>
                ),
              )}
              {monthDays.map((day) => {
                const dayKey = formatDateKey(day);
                const dayEvents = calendarEventsByDay.get(dayKey) ?? [];
                const requestCount = dayEvents.filter(
                  (event) => event.kind === "request",
                ).length;
                const taskCount = dayEvents.filter(
                  (event) => event.kind === "task",
                ).length;
                const isSelected = dayKey === selectedDayKey;
                const isOutsideMonth =
                  day.getMonth() !== calendarMonth.getMonth();

                return (
                  <button
                    className={isSelected ? "solid-button" : "ghost-button"}
                    key={dayKey}
                    onClick={() => setSelectedDayKey(dayKey)}
                    style={{
                      alignItems: "flex-start",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      justifyContent: "space-between",
                      minHeight: 96,
                      opacity: isOutsideMonth ? 0.55 : 1,
                      width: "100%",
                    }}
                    type="button"
                  >
                    <strong>{day.getDate()}</strong>
                    <span style={{ fontSize: 12 }}>
                      {requestCount} {t("requests.absenceEvents")}
                    </span>
                    <span style={{ fontSize: 12 }}>
                      {taskCount} {t("requests.taskEvents")}
                    </span>
                  </button>
                );
              })}
            </div>
          </article>

          <article className="panel panel-large">
            <div className="panel-header">
              <div>
                <span className="section-kicker">
                  {t("requests.selectedDayTitle")}
                </span>
                <h2>
                  {new Date(`${selectedDayKey}T00:00:00`).toLocaleDateString(
                    undefined,
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    },
                  )}
                </h2>
              </div>
            </div>

            {selectedDayEvents.length > 0 ? (
              <div className="section-stack">
                {selectedDayEvents.map((event) =>
                  event.kind === "request" ? (
                    <article className="mini-panel" key={event.id}>
                      <div className="panel-header">
                        <div>
                          <span className="section-kicker">
                            {t("requests.requestEvent")}
                          </span>
                          <h3>{event.request.title}</h3>
                        </div>
                        <span className="status-chip">
                          {event.request.status}
                        </span>
                      </div>
                      <div className="detail-list">
                        <div className="detail-row">
                          <span>{t("requests.type")}</span>
                          <strong>
                            {formatRequestType(event.request.requestType, t)}
                          </strong>
                        </div>
                        <div className="detail-row">
                          <span>{t("requests.period")}</span>
                          <strong>
                            {new Date(
                              event.request.startsOn,
                            ).toLocaleDateString()}{" "}
                            -{" "}
                            {new Date(
                              event.request.endsOn,
                            ).toLocaleDateString()}
                          </strong>
                        </div>
                      </div>
                      {event.request.reason ? (
                        <p>{event.request.reason}</p>
                      ) : null}
                    </article>
                  ) : (
                    <article className="mini-panel" key={event.id}>
                      <div className="panel-header">
                        <div>
                          <span className="section-kicker">
                            {t("requests.taskEvent")}
                          </span>
                          <h3>{event.task.title}</h3>
                        </div>
                        <span className="status-chip">{event.task.status}</span>
                      </div>
                      <div className="detail-list">
                        <div className="detail-row">
                          <span>{t("collaboration.priority")}</span>
                          <strong>{event.task.priority}</strong>
                        </div>
                        <div className="detail-row">
                          <span>{t("collaboration.assignToGroup")}</span>
                          <strong>{event.task.group?.name ?? "—"}</strong>
                        </div>
                        <div className="detail-row">
                          <span>{t("collaboration.dueAt")}</span>
                          <strong>
                            {event.task.dueAt
                              ? new Date(event.task.dueAt).toLocaleString()
                              : "—"}
                          </strong>
                        </div>
                      </div>
                      {event.task.description ? (
                        <p>{parseTaskMeta(event.task.description).body}</p>
                      ) : null}
                    </article>
                  ),
                )}
              </div>
            ) : (
              <div className="empty-state">{t("requests.noDayItems")}</div>
            )}
          </article>
        </section>

        <section className="employee-grid">
          <article className="panel panel-large">
            <div className="panel-header">
              <div>
                <span className="section-kicker">
                  {t("requests.requestHistory")}
                </span>
                <h2>{t("requests.employeeTitle")}</h2>
              </div>
            </div>
            {items.length > 0 ? (
              <div className="section-stack">
                {items.map((item) => (
                  <article className="mini-panel" key={item.id}>
                    <div className="panel-header">
                      <div>
                        <span className="section-kicker">
                          {formatRequestType(item.requestType, t)}
                        </span>
                        <h3>{item.title}</h3>
                      </div>
                      <span className="status-chip">{item.status}</span>
                    </div>
                    <div className="detail-list">
                      <div className="detail-row">
                        <span>{t("requests.period")}</span>
                        <strong>
                          {new Date(item.startsOn).toLocaleDateString()} -{" "}
                          {new Date(item.endsOn).toLocaleDateString()}
                        </strong>
                      </div>
                      <div className="detail-row">
                        <span>{t("requests.days")}</span>
                        <strong>{item.requestedDays}</strong>
                      </div>
                      {item.relatedRequest ? (
                        <div className="detail-row">
                          <span>{t("requests.originalVacation")}</span>
                          <strong>
                            {new Date(
                              item.relatedRequest.startsOn,
                            ).toLocaleDateString()}{" "}
                            -{" "}
                            {new Date(
                              item.relatedRequest.endsOn,
                            ).toLocaleDateString()}
                          </strong>
                        </div>
                      ) : null}
                    </div>
                    {item.attachments.length > 0 ? (
                      <div className="section-stack compact-stack">
                        <span className="section-kicker">
                          {t("requests.attachments")}
                        </span>
                        {item.attachments.map((attachment) => (
                          <a
                            href={attachment.url ?? "#"}
                            key={attachment.id}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {attachment.fileName}
                          </a>
                        ))}
                      </div>
                    ) : null}
                    <div className="section-stack compact-stack">
                      <span className="section-kicker">
                        {t("requests.timeline")}
                      </span>
                      {item.approvalSteps.map((step) => (
                        <div className="timeline-item" key={step.id}>
                          <strong>
                            #{step.sequence} {step.approverEmployee.firstName}{" "}
                            {step.approverEmployee.lastName}
                          </strong>
                          <span>{step.status}</span>
                        </div>
                      ))}
                      {item.comments.map((comment) => (
                        <div className="timeline-item" key={comment.id}>
                          <strong>
                            {comment.authorEmployee.firstName}{" "}
                            {comment.authorEmployee.lastName}
                          </strong>
                          <span>{comment.body}</span>
                        </div>
                      ))}
                    </div>
                    <form
                      className="form-grid"
                      onSubmit={(event) => void addComment(item.id, event)}
                    >
                      <input
                        name="body"
                        placeholder={t("requests.commentPlaceholder")}
                        required
                      />
                      <button className="ghost-button" type="submit">
                        {t("requests.addComment")}
                      </button>
                    </form>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">{t("requests.noRequests")}</div>
            )}
          </article>
        </section>
      </section>
    </EmployeeShell>
  );
}
