"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { ChatThreadItem } from "@smart/types";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageSquareMore, SendHorizonal, UsersRound } from "lucide-react";
import { EmployeeShell } from "@/components/employee-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TaskPresenceStrip } from "@/components/task-presence-strip";
import { getSession } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { createCollaborationSocket } from "@/lib/collaboration-socket";
import { useI18n } from "@/lib/i18n";

function EmployeeChatsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedThreadId = searchParams.get("threadId") ?? "";
  const { t } = useI18n();
  const [threads, setThreads] = useState<ChatThreadItem[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [draft, setDraft] = useState("");

  async function loadData() {
    const session = getSession();
    if (!session) return;

    const data = await apiRequest<ChatThreadItem[]>("/collaboration/chats", {
      token: session.accessToken,
    });
    setThreads(data);
    setSelectedThreadId(
      (current) => current || requestedThreadId || data[0]?.id || "",
    );
  }

  useEffect(() => {
    void loadData();

    const session = getSession();
    if (!session) return;
    const socket = createCollaborationSocket(session.accessToken);
    socket.on("chat:message", () => {
      void loadData();
    });
    socket.on("chat:thread-updated", () => {
      void loadData();
    });

    return () => {
      socket.disconnect();
    };
  }, [requestedThreadId]);

  useEffect(() => {
    const session = getSession();
    const selected = threads.find((item) => item.id === selectedThreadId);
    if (!session || !selected || !selected.unreadCount) return;

    void apiRequest(`/collaboration/chats/${selected.id}/read`, {
      method: "POST",
      token: session.accessToken,
    }).then(() => loadData());
  }, [selectedThreadId, threads]);

  async function sendMessage() {
    const session = getSession();
    if (!session || !selectedThreadId || !draft.trim()) return;

    await apiRequest(`/collaboration/chats/${selectedThreadId}/messages`, {
      method: "POST",
      token: session.accessToken,
      body: JSON.stringify({ body: draft.trim() }),
    });

    setDraft("");
    await loadData();
  }

  const selected = threads.find((item) => item.id === selectedThreadId) ?? null;

  const presenceItems = useMemo(() => {
    if (!selected) return [];
    return selected.participants.map((participant) => ({
      id: participant.id,
      name: `${participant.employee.firstName} ${participant.employee.lastName}`,
      tasks: participant.lastReadAt ? 0 : 1,
      done: Boolean(participant.lastReadAt),
    }));
  }, [selected]);

  return (
    <EmployeeShell>
      <section className="section-stack">
        <section className="section-header">
          <span className="eyebrow">{t("employeePortal.chats")}</span>
          <h1>Chat stays close to work, not on a separate island.</h1>
          <p>
            The thread list, participants, and live messages sit in one
            workspace, with the floating quick-chat button always available from
            the rest of the app.
          </p>
        </section>

        <section className="hero-banner">
          <div className="hero-banner-copy">
            <Badge className="w-fit" variant="neutral">
              Thread participants
            </Badge>
            <h2>See who is in the conversation and who already caught up.</h2>
            <p className="hero-copy">
              The same avatar strip language from tasks carries into chat so the
              whole employee workspace feels related.
            </p>
            <TaskPresenceStrip
              emptyLabel={t("collaboration.noChats")}
              items={presenceItems}
            />
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <span className="section-kicker">Conversation list</span>
                <h2>{threads.length} threads</h2>
              </div>
            </div>
            {threads.length ? (
              <div className="session-stack">
                {threads.map((thread) => (
                  <button
                    className="timeline-item text-left"
                    key={thread.id}
                    onClick={() => {
                      setSelectedThreadId(thread.id);
                      router.replace(`/employee/chats?threadId=${thread.id}`);
                    }}
                    type="button"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <strong>
                        {thread.title ??
                          thread.group?.name ??
                          thread.participants
                            .map(
                              (participant) =>
                                `${participant.employee.firstName} ${participant.employee.lastName}`,
                            )
                            .join(", ")}
                      </strong>
                      {thread.unreadCount ? (
                        <Badge>{thread.unreadCount}</Badge>
                      ) : null}
                    </span>
                    <span>
                      {thread.messages.at(-1)?.body ?? "No messages yet."}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state">{t("collaboration.noChats")}</div>
            )}
          </div>
        </section>

        <section className="content-grid">
          <article className="panel panel-large">
            <div className="panel-header">
              <div>
                <span className="section-kicker">
                  {t("collaboration.chatTitle")}
                </span>
                <h2>
                  {selected?.title ??
                    selected?.group?.name ??
                    t("collaboration.noChats")}
                </h2>
              </div>
              {selected ? (
                <Badge variant="neutral">
                  {selected.messages.length} messages
                </Badge>
              ) : null}
            </div>

            {selected ? (
              <div className="section-stack">
                <div className="session-stack">
                  {selected.messages.map((item) => {
                    const mine =
                      selected.createdByEmployee.id === item.authorEmployeeId;
                    return (
                      <div className="timeline-item" key={item.id}>
                        <span className="flex items-center gap-2">
                          <MessageSquareMore className="size-4 text-[color:var(--muted-foreground)]" />
                          <strong>
                            {item.authorEmployee.firstName}{" "}
                            {item.authorEmployee.lastName}
                          </strong>
                        </span>
                        <span>{item.body}</span>
                        <span>{new Date(item.createdAt).toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                  <Input
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={t("collaboration.messagePlaceholder")}
                    value={draft}
                  />
                  <Button onClick={() => void sendMessage()}>
                    <SendHorizonal className="size-4" />
                    {t("collaboration.sendMessage")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="empty-state">{t("collaboration.noChats")}</div>
            )}
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <span className="section-kicker">People</span>
                <h2>Conversation members</h2>
              </div>
            </div>
            {selected ? (
              <div className="session-stack">
                {selected.participants.map((participant) => (
                  <div className="timeline-item" key={participant.id}>
                    <span className="flex items-center gap-2">
                      <UsersRound className="size-4 text-[color:var(--muted-foreground)]" />
                      <strong>
                        {participant.employee.firstName}{" "}
                        {participant.employee.lastName}
                      </strong>
                    </span>
                    <span>{participant.employee.employeeNumber}</span>
                    <span>{participant.employee.user.email}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">{t("collaboration.noChats")}</div>
            )}
          </article>
        </section>
      </section>
    </EmployeeShell>
  );
}

export default function EmployeeChatsPage() {
  return (
    <Suspense fallback={null}>
      <EmployeeChatsContent />
    </Suspense>
  );
}
