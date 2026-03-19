'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ScanFace,
  ShieldAlert,
  Users,
  XCircle,
} from 'lucide-react';
import { BiometricReviewInboxResponse, BiometricReviewResponse } from '@smart/types';
import { AdminShell } from '../../components/admin-shell';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { apiRequest } from '../../lib/api';
import { getSession } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';

type EmployeeOption = {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
};

const reviewResultOptions = ['', 'PASSED', 'REVIEW', 'FAILED'] as const;

function scoreLabel(value: number | null) {
  if (value === null) return '—';
  return `${Math.round(value * 100)}%`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function BiometricReviewPage() {
  const { t, locale } = useI18n();
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [reviews, setReviews] = useState<BiometricReviewResponse | null>(null);
  const [inbox, setInbox] = useState<BiometricReviewInboxResponse | null>(null);
  const [employeeId, setEmployeeId] = useState('');
  const [result, setResult] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [reviewCommentById, setReviewCommentById] = useState<Record<string, string>>({});

  async function loadReviewData() {
    const session = getSession();
    if (!session) return;
    const searchParams = new URLSearchParams();
    if (employeeId && employeeId !== '__all') searchParams.set('employeeId', employeeId);
    if (result && result !== '__all') searchParams.set('result', result);

    const [reviewData, inboxData] = await Promise.all([
      apiRequest<BiometricReviewResponse>(`/biometric/team/reviews?${searchParams.toString()}`, { token: session.accessToken }),
      apiRequest<BiometricReviewInboxResponse>('/biometric/reviews/inbox', { token: session.accessToken }),
    ]);
    setReviews(reviewData);
    setInbox(inboxData);
  }

  useEffect(() => {
    const session = getSession();
    if (!session) return;
    void apiRequest<EmployeeOption[]>('/employees', { token: session.accessToken }).then(setEmployees).catch(() => setEmployees([]));
  }, []);

  useEffect(() => {
    void loadReviewData().catch(() => {
      setReviews({ totals: { employees: 0, enrolled: 0, reviewRequired: 0, notEnrolled: 0 }, items: [] });
      setInbox({ items: [] });
    });
  }, [employeeId, result]);

  const totals = reviews?.totals;

  return (
    <AdminShell>
      <main className="flex w-full flex-col gap-8 px-6 py-8 lg:px-10">
        {/* ── Page header ── */}
        <header className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            {locale === 'ru' ? 'Сотрудники' : 'Employees'}
          </span>
          <h1 className="text-2xl font-bold tracking-tight">
            {locale === 'ru' ? 'Биометрия' : 'Biometric'}
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {locale === 'ru' ? 'Верификация лица, регистрация и ручной ревью' : 'Face verification, enrollment and manual review'}
          </p>
        </header>

        {/* ── KPI stripe ── */}
        <div className="grid grid-cols-2 rounded-xl border bg-card sm:grid-cols-4">
          {[
            { label: locale === 'ru' ? 'Всего' : 'Total', value: totals?.employees ?? 0, icon: Users },
            { label: locale === 'ru' ? 'Зарегистрированы' : 'Enrolled', value: totals?.enrolled ?? 0, icon: CheckCircle2, color: 'text-green-600' },
            { label: locale === 'ru' ? 'Ожидает ревью' : 'Review', value: totals?.reviewRequired ?? 0, icon: ShieldAlert, color: 'text-amber-600' },
            { label: locale === 'ru' ? 'Не зарегистрированы' : 'Not enrolled', value: totals?.notEnrolled ?? 0, icon: XCircle },
          ].map((m, i) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className={`flex flex-col gap-1 border-b px-5 py-4 sm:border-b-0 ${i !== 0 ? 'sm:border-l' : ''}`}>
                <div className="flex items-center gap-2">
                  <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{m.label}</span>
                  <Icon className={`h-3.5 w-3.5 ${m.color || 'text-muted-foreground/60'}`} />
                </div>
                <span className={`text-xl font-bold ${m.color || ''}`}>{m.value}</span>
              </div>
            );
          })}
        </div>

        {/* ── Tabs + filters ── */}
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex overflow-hidden rounded-xl border border-border">
              <button
                aria-label="Pending review"
                className={`flex items-center gap-2 px-4 py-2 text-sm font-heading font-medium transition-colors ${
                  activeTab === 'pending'
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('pending')}
                type="button"
              >
                {locale === 'ru' ? 'Ожидают ревью' : 'Pending review'}
                {inbox && inbox.items.length > 0 && (
                  <Badge variant="default" className="h-5 px-1.5 text-[10px]">{inbox.items.length}</Badge>
                )}
              </button>
              <button
                aria-label="All employees"
                className={`flex items-center gap-2 px-4 py-2 text-sm font-heading font-medium transition-colors ${
                  activeTab === 'all'
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('all')}
                type="button"
              >
                {locale === 'ru' ? 'Все сотрудники' : 'All employees'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger className="w-[200px] whitespace-nowrap">
                  <SelectValue placeholder={locale === 'ru' ? 'Все сотрудники' : 'All employees'} />
                </SelectTrigger>
                <SelectContent className="biometric-select-content">
                  <SelectItem className="biometric-select-item" value="__all">{locale === 'ru' ? 'Все сотрудники' : 'All employees'}</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem className="biometric-select-item" key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={result} onValueChange={(v) => setResult(v as (typeof reviewResultOptions)[number])}>
                <SelectTrigger className="w-[180px] whitespace-nowrap">
                  <SelectValue placeholder={locale === 'ru' ? 'Все результаты' : 'All results'} />
                </SelectTrigger>
                <SelectContent className="biometric-select-content">
                  <SelectItem className="biometric-select-item" value="__all">{locale === 'ru' ? 'Все результаты' : 'All results'}</SelectItem>
                  <SelectItem className="biometric-select-item" value="PASSED">Passed</SelectItem>
                  <SelectItem className="biometric-select-item" value="REVIEW">Review</SelectItem>
                  <SelectItem className="biometric-select-item" value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ─── Pending review tab ─── */}
          {activeTab === 'pending' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{locale === 'ru' ? 'Ожидающие ревью' : 'Pending Reviews'}</CardTitle>
                <CardDescription>{locale === 'ru' ? 'Верификации, требующие ручного подтверждения' : 'Verifications requiring manual approval'}</CardDescription>
              </CardHeader>
              <CardContent>
                {inbox && inbox.items.length > 0 ? (
                  <div className="divide-y">
                    {inbox.items.map((item) => (
                      <div className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0" key={item.verificationId}>
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                              <ShieldAlert className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium">{item.employeeName}</p>
                              <p className="text-xs text-muted-foreground">{item.employeeNumber} · {item.department} · {item.location}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm tabular-nums">
                            <span>Liveness: <strong>{scoreLabel(item.livenessScore)}</strong></span>
                            <span>Match: <strong>{scoreLabel(item.matchScore)}</strong></span>
                            <span className="text-xs text-muted-foreground">{formatDate(item.capturedAt)} {formatTime(item.capturedAt)}</span>
                          </div>
                        </div>
                        {item.reviewReason && <p className="text-sm text-amber-700">{item.reviewReason}</p>}
                        {item.artifacts.length > 0 && (
                          <div className="flex gap-2">
                            {item.artifacts.map((a) =>
                              a.url ? (
                                <a href={a.url} key={a.id} rel="noreferrer" target="_blank">
                                  <img alt="" className="h-20 w-20 rounded-xl object-cover transition-transform hover:scale-105" src={a.url} />
                                </a>
                              ) : (
                                <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-muted text-[10px] text-muted-foreground" key={a.id}>
                                  {a.stepId ?? a.kind}
                                </div>
                              ),
                            )}
                          </div>
                        )}
                        <div className="flex flex-wrap items-end gap-2">
                          <Input
                            className="min-w-0 flex-1"
                            onChange={(e) => setReviewCommentById((c) => ({ ...c, [item.verificationId]: e.target.value }))}
                            placeholder={locale === 'ru' ? 'Комментарий (опционально)' : 'Comment (optional)'}
                            value={reviewCommentById[item.verificationId] ?? ''}
                          />
                          <Button
                            onClick={async () => {
                              const session = getSession();
                              if (!session) return;
                              await apiRequest(`/biometric/verifications/${item.verificationId}/review`, {
                                method: 'POST', token: session.accessToken,
                                body: JSON.stringify({ decision: 'APPROVE', comment: reviewCommentById[item.verificationId] ?? undefined }),
                              });
                              await loadReviewData();
                            }}
                            type="button"
                          >
                            {locale === 'ru' ? 'Подтвердить' : 'Approve'}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={async () => {
                              const session = getSession();
                              if (!session) return;
                              await apiRequest(`/biometric/verifications/${item.verificationId}/review`, {
                                method: 'POST', token: session.accessToken,
                                body: JSON.stringify({ decision: 'REJECT', comment: reviewCommentById[item.verificationId] ?? undefined }),
                              });
                              await loadReviewData();
                            }}
                            type="button"
                          >
                            {locale === 'ru' ? 'Отклонить' : 'Reject'}
                          </Button>
                          <Button variant="ghost" asChild>
                            <Link href={`/employees/${item.employeeId}`}>
                              {locale === 'ru' ? 'Карточка' : 'Profile'}
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-16 text-center text-muted-foreground">
                    <CheckCircle2 className="mb-2 h-8 w-8 text-green-500 opacity-50" />
                    <p className="font-medium">{locale === 'ru' ? 'Нет ожидающих ревью' : 'No pending reviews'}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ─── All employees tab ─── */}
          {activeTab === 'all' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{locale === 'ru' ? 'Все сотрудники' : 'All Employees'}</CardTitle>
                <CardDescription>{locale === 'ru' ? 'Биометрический статус и история верификаций' : 'Biometric status and verification history'}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{locale === 'ru' ? 'Сотрудник' : 'Employee'}</TableHead>
                      <TableHead>{locale === 'ru' ? 'Статус' : 'Status'}</TableHead>
                      <TableHead>{locale === 'ru' ? 'Зарегистрирован' : 'Enrolled'}</TableHead>
                      <TableHead>{locale === 'ru' ? 'Последняя проверка' : 'Last verified'}</TableHead>
                      <TableHead>{locale === 'ru' ? 'Результат' : 'Result'}</TableHead>
                      <TableHead className="text-right">Liveness</TableHead>
                      <TableHead className="text-right">Match</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviews && reviews.items.length > 0 ? (
                      reviews.items.map((item) => (
                        <TableRow key={item.employeeId}>
                          <TableCell>
                            <p className="font-medium">{item.employeeName}</p>
                            <p className="text-[11px] text-muted-foreground">{item.employeeNumber} · {item.department}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              item.enrollmentStatus === 'ENROLLED' ? 'success' :
                              item.pendingReview ? 'warning' : 'secondary'
                            }>
                              {item.pendingReview ? (
                                <><ShieldAlert className="mr-1 h-3 w-3" /> Review</>
                              ) : item.enrollmentStatus === 'ENROLLED' ? (
                                <><CheckCircle2 className="mr-1 h-3 w-3" /> {item.enrollmentStatus}</>
                              ) : (
                                item.enrollmentStatus
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{item.enrolledAt ? formatDate(item.enrolledAt) : '—'}</TableCell>
                          <TableCell className="text-xs">{item.lastVerifiedAt ? formatDate(item.lastVerifiedAt) : '—'}</TableCell>
                          <TableCell>
                            {item.latestVerification ? (
                              <Badge variant={
                                item.latestVerification.result === 'PASSED' ? 'success' :
                                item.latestVerification.result === 'FAILED' ? 'danger' : 'warning'
                              }>
                                {item.latestVerification.result === 'PASSED' ? <CheckCircle2 className="mr-1 h-3 w-3" /> :
                                 item.latestVerification.result === 'FAILED' ? <XCircle className="mr-1 h-3 w-3" /> :
                                 <ShieldAlert className="mr-1 h-3 w-3" />}
                                {item.latestVerification.result}
                              </Badge>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums">{item.latestVerification ? scoreLabel(item.latestVerification.livenessScore) : '—'}</TableCell>
                          <TableCell className="text-right text-xs tabular-nums">{item.latestVerification ? scoreLabel(item.latestVerification.matchScore) : '—'}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/employees/${item.employeeId}`}>
                                {locale === 'ru' ? 'Открыть' : 'Open'}
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell className="py-16 text-center text-muted-foreground" colSpan={8}>
                          <ScanFace className="mx-auto mb-2 h-8 w-8 opacity-40" />
                          <p>{locale === 'ru' ? 'Нет данных' : 'No data'}</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </AdminShell>
  );
}
