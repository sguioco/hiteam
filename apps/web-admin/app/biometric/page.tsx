'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ScanFace,
  Users,
  XCircle,
} from 'lucide-react';
import { BiometricReviewResponse } from '@smart/types';
import { AdminShell } from '../../components/admin-shell';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { apiRequest } from '../../lib/api';
import { getSession } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';

type EmployeeOption = {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
};

const resultOptions = ['', 'PASSED', 'FAILED', 'REVIEW'] as const;

function scoreLabel(value: number | null) {
  if (value === null) return '—';
  return `${Math.round(value * 100)}%`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function BiometricReviewPage() {
  const { locale } = useI18n();
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [reviews, setReviews] = useState<BiometricReviewResponse | null>(null);
  const [employeeId, setEmployeeId] = useState('');
  const [result, setResult] = useState<string>('');

  async function loadReviewData() {
    const session = getSession();
    if (!session) return;
    const searchParams = new URLSearchParams();
    if (employeeId && employeeId !== '__all') searchParams.set('employeeId', employeeId);
    if (result && result !== '__all') searchParams.set('result', result);

    const suffix = searchParams.toString();
    const reviewData = await apiRequest<BiometricReviewResponse>(
      `/biometric/team/reviews${suffix ? `?${suffix}` : ''}`,
      { token: session.accessToken },
    );
    setReviews(reviewData);
  }

  useEffect(() => {
    const session = getSession();
    if (!session) return;
    void apiRequest<EmployeeOption[]>('/employees', { token: session.accessToken }).then(setEmployees).catch(() => setEmployees([]));
  }, []);

  useEffect(() => {
    void loadReviewData().catch(() => {
      setReviews({ totals: { employees: 0, enrolled: 0, reviewRequired: 0, notEnrolled: 0 }, items: [] });
    });
  }, [employeeId, result]);

  const failedCount = useMemo(
    () => reviews?.items.filter((item) => item.latestVerification?.result === 'FAILED').length ?? 0,
    [reviews],
  );

  return (
    <AdminShell>
      <main className="flex w-full flex-col gap-8 px-6 py-8 lg:px-10">
        <header className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            {locale === 'ru' ? 'Сотрудники' : 'Employees'}
          </span>
          <h1 className="text-2xl font-bold tracking-tight">
            {locale === 'ru' ? 'Биометрия' : 'Biometric'}
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {locale === 'ru'
              ? 'Автоматическая верификация лица и история сканов за последние 7 дней.'
              : 'Automatic face verification and scan history for the last 7 days.'}
          </p>
        </header>

        <div className="grid grid-cols-2 rounded-xl border bg-card sm:grid-cols-4">
          {[
            { label: locale === 'ru' ? 'Всего' : 'Total', value: reviews?.totals.employees ?? 0, icon: Users },
            { label: locale === 'ru' ? 'Зарегистрированы' : 'Enrolled', value: reviews?.totals.enrolled ?? 0, icon: CheckCircle2, color: 'text-green-600' },
            { label: locale === 'ru' ? 'Не пройдено' : 'Failed', value: failedCount, icon: XCircle, color: 'text-red-600' },
            { label: locale === 'ru' ? 'Не зарегистрированы' : 'Not enrolled', value: reviews?.totals.notEnrolled ?? 0, icon: ScanFace },
          ].map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className={`flex flex-col gap-1 border-b px-5 py-4 sm:border-b-0 ${index !== 0 ? 'sm:border-l' : ''}`}>
                <div className="flex items-center gap-2">
                  <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {metric.label}
                  </span>
                  <Icon className={`h-3.5 w-3.5 ${metric.color || 'text-muted-foreground/60'}`} />
                </div>
                <span className={`text-xl font-bold ${metric.color || ''}`}>{metric.value}</span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {locale === 'ru' ? 'Последние автоматические проверки' : 'Latest automatic scans'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {locale === 'ru'
                ? 'Менеджер видит результат, проценты совпадения и переход к карточке сотрудника.'
                : 'Managers can inspect the result, similarity scores, and open the employee profile.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="w-[200px] whitespace-nowrap">
                <SelectValue placeholder={locale === 'ru' ? 'Все сотрудники' : 'All employees'} />
              </SelectTrigger>
              <SelectContent className="biometric-select-content">
                <SelectItem className="biometric-select-item" value="__all">
                  {locale === 'ru' ? 'Все сотрудники' : 'All employees'}
                </SelectItem>
                {employees.map((employee) => (
                  <SelectItem className="biometric-select-item" key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={result} onValueChange={(value) => setResult(value as (typeof resultOptions)[number])}>
              <SelectTrigger className="w-[180px] whitespace-nowrap">
                <SelectValue placeholder={locale === 'ru' ? 'Все результаты' : 'All results'} />
              </SelectTrigger>
              <SelectContent className="biometric-select-content">
                <SelectItem className="biometric-select-item" value="__all">
                  {locale === 'ru' ? 'Все результаты' : 'All results'}
                </SelectItem>
                <SelectItem className="biometric-select-item" value="PASSED">Passed</SelectItem>
                <SelectItem className="biometric-select-item" value="FAILED">Failed</SelectItem>
                <SelectItem className="biometric-select-item" value="REVIEW">Review</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {locale === 'ru' ? 'Командная история сканов' : 'Team scan history'}
            </CardTitle>
            <CardDescription>
              {locale === 'ru'
                ? 'Статус регистрации, последняя автоматическая проверка и быстрый переход в карточку сотрудника.'
                : 'Enrollment status, latest automatic verification, and a quick link to the employee profile.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{locale === 'ru' ? 'Сотрудник' : 'Employee'}</TableHead>
                  <TableHead>{locale === 'ru' ? 'Статус' : 'Status'}</TableHead>
                  <TableHead>{locale === 'ru' ? 'Регистрация' : 'Enrolled'}</TableHead>
                  <TableHead>{locale === 'ru' ? 'Последний скан' : 'Last scan'}</TableHead>
                  <TableHead>{locale === 'ru' ? 'Результат' : 'Result'}</TableHead>
                  <TableHead className="text-right">Match</TableHead>
                  <TableHead className="text-right">Liveness</TableHead>
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
                        <Badge variant={item.enrollmentStatus === 'ENROLLED' ? 'success' : 'secondary'}>
                          {item.enrollmentStatus === 'ENROLLED' ? (
                            <>
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              {locale === 'ru' ? 'Активна' : 'Active'}
                            </>
                          ) : (
                            item.enrollmentStatus
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{item.enrolledAt ? formatDate(item.enrolledAt) : '—'}</TableCell>
                      <TableCell className="text-xs">
                        {item.latestVerification ? formatDateTime(item.latestVerification.capturedAt) : '—'}
                      </TableCell>
                      <TableCell>
                        {item.latestVerification ? (
                          <Badge
                            variant={
                              item.latestVerification.result === 'PASSED'
                                ? 'success'
                                : item.latestVerification.result === 'FAILED'
                                ? 'danger'
                                : 'warning'
                            }
                          >
                            {item.latestVerification.result === 'PASSED' ? (
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                            ) : item.latestVerification.result === 'FAILED' ? (
                              <XCircle className="mr-1 h-3 w-3" />
                            ) : (
                              <ScanFace className="mr-1 h-3 w-3" />
                            )}
                            {item.latestVerification.result}
                          </Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {item.latestVerification ? scoreLabel(item.latestVerification.matchScore) : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {item.latestVerification ? scoreLabel(item.latestVerification.livenessScore) : '—'}
                      </TableCell>
                      <TableCell>
                        <Button asChild size="sm" variant="ghost">
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
      </main>
    </AdminShell>
  );
}
