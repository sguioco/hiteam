"use client";

import { useCallback, useEffect, useState } from "react";
import type { AttendanceCorrectionRequestItem } from "@smart/types";
import { apiRequest } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { getRuntimeLocaleTag, runtimeLocalize } from "@/lib/runtime-locale";

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(getRuntimeLocaleTag(), {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export function AttendanceCorrectionInbox({ onDecision }: { onDecision: () => void }) {
  const session = getSession();
  const token = session?.accessToken;
  const canApprove = session?.user.roleCodes.some((role) =>
    ["tenant_owner", "hr_admin", "operations_admin"].includes(role)) ?? false;
  const [requests, setRequests] = useState<AttendanceCorrectionRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decisionId, setDecisionId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!token || !canApprove) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<AttendanceCorrectionRequestItem[]>("/attendance/corrections/inbox", {
        token,
        skipClientCache: true,
      });
      setRequests(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : runtimeLocalize("Не удалось загрузить заявки.", "Could not load requests."));
    } finally {
      setLoading(false);
    }
  }, [token, canApprove]);

  useEffect(() => { void load(); }, [load]);

  async function decide(request: AttendanceCorrectionRequestItem, action: "approve" | "reject") {
    if (!token || decisionId) return;
    const comment = comments[request.id]?.trim() ?? "";
    if (action === "reject" && !comment) {
      setError(runtimeLocalize("Укажите причину отклонения.", "Enter a reason for rejection."));
      return;
    }
    setDecisionId(request.id);
    setError(null);
    try {
      await apiRequest(`/attendance/corrections/${encodeURIComponent(request.id)}/${action}`, {
        token,
        method: "POST",
        body: JSON.stringify({ comment: comment || undefined }),
      });
      setRequests((current) => current.filter((item) => item.id !== request.id));
      setComments((current) => {
        const next = { ...current };
        delete next[request.id];
        return next;
      });
      onDecision();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : runtimeLocalize("Не удалось сохранить решение.", "Could not save the decision."));
    } finally {
      setDecisionId(null);
    }
  }

  if (!canApprove) return null;

  return (
    <section className="dashboard-card space-y-4" aria-label={runtimeLocalize("Согласование корректировок", "Correction approvals")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">
            {runtimeLocalize("Согласование корректировок", "Correction approvals")}
          </h2>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            {runtimeLocalize("Заявки сотрудников на исправление времени отметок", "Employee requests to correct check-in and check-out times")}
          </p>
        </div>
        <button className="rounded-xl border border-[color:var(--border)] px-4 py-2 text-sm font-medium disabled:opacity-50" disabled={loading || Boolean(decisionId)} onClick={() => void load()} type="button">
          {runtimeLocalize("Обновить", "Refresh")}
        </button>
      </div>
      {error ? <p className="rounded-xl bg-[color:var(--soft-danger)] p-3 text-sm text-[color:var(--danger)]" role="alert">{error}</p> : null}
      {loading && requests.length === 0 ? <p className="text-sm text-[color:var(--muted-foreground)]">{runtimeLocalize("Загрузка заявок…", "Loading requests…")}</p> : null}
      {!loading && requests.length === 0 && !error ? <p className="text-sm text-[color:var(--muted-foreground)]">{runtimeLocalize("Ожидающих заявок нет.", "No pending correction requests.")}</p> : null}
      {requests.map((request) => (
        <article className="space-y-3 rounded-2xl border border-[color:var(--border)] bg-white p-4" key={request.id}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-[color:var(--foreground)]">{request.employee.firstName} {request.employee.lastName}</p>
              <p className="text-sm text-[color:var(--muted-foreground)]">{request.employee.primaryLocation.name} · {formatDateTime(request.session.startedAt)}</p>
            </div>
            <span className="rounded-full bg-[color:var(--soft-warning)] px-3 py-1 text-xs font-semibold text-[color:var(--warning)]">{runtimeLocalize("Ожидает решения", "Pending review")}</span>
          </div>
          <p className="text-sm text-[color:var(--foreground)]"><span className="font-semibold">{runtimeLocalize("Причина:", "Reason:")}</span> {request.reason}</p>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p>{runtimeLocalize("Приход", "Check-in")}: {formatDateTime(request.session.startedAt)} → <strong>{formatDateTime(request.proposedStartedAt ?? request.session.startedAt)}</strong></p>
            <p>{runtimeLocalize("Уход", "Check-out")}: {formatDateTime(request.session.endedAt)} → <strong>{formatDateTime(request.proposedEndedAt ?? request.session.endedAt)}</strong></p>
          </div>
          <label className="block text-sm font-medium text-[color:var(--foreground)]" htmlFor={`correction-comment-${request.id}`}>{runtimeLocalize("Комментарий к решению (обязателен при отклонении)", "Decision comment (required for rejection)")}</label>
          <textarea className="min-h-20 w-full rounded-xl border border-[color:var(--border)] p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]" id={`correction-comment-${request.id}`} maxLength={500} onChange={(event) => setComments((current) => ({ ...current, [request.id]: event.target.value }))} value={comments[request.id] ?? ""} />
          <div className="flex flex-wrap gap-2">
            <button className="rounded-xl bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={Boolean(decisionId)} onClick={() => void decide(request, "approve")} type="button">{runtimeLocalize("Одобрить", "Approve")}</button>
            <button className="rounded-xl border border-[color:var(--danger)] px-4 py-2 text-sm font-semibold text-[color:var(--danger)] disabled:opacity-50" disabled={Boolean(decisionId)} onClick={() => void decide(request, "reject")} type="button">{runtimeLocalize("Отклонить", "Reject")}</button>
          </div>
        </article>
      ))}
    </section>
  );
}
