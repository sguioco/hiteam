'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Search,
  ScanFace,
  Users,
  XCircle,
} from 'lucide-react';
import { BiometricReviewResponse } from '@smart/types';
import type { SortDescriptor } from 'react-aria-components';
import { AdminShell } from '../../components/admin-shell';
import { Avatar } from '../../components/base/avatar/avatar';
import { Table } from '../../components/application/table/table';
import { Input } from '../../components/ui/input';
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
import { getMockAvatarDataUrl } from '../../lib/mock-avatar';

type EmployeeOption = {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  avatarUrl?: string | null;
  department?: { name: string } | null;
  primaryLocation?: { name: string } | null;
};

const resultOptions = ['', 'PASSED', 'FAILED', 'REVIEW'] as const;
type BiometricSortColumn =
  | 'employeeName'
  | 'enrollmentStatus'
  | 'lastScan'
  | 'result'
  | 'match'
  | 'liveness';

function scoreLabel(value: number | null) {
  if (value === null) return '—';
  return `${Math.round(value * 100)}%`;
}

function getEmployeeInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function getBiometricTone(
  status: 'NOT_STARTED' | 'PENDING' | 'ENROLLED' | 'FAILED' | 'PASSED' | 'REVIEW',
) {
  if (status === 'ENROLLED' || status === 'PASSED') {
    return 'is-success';
  }

  if (status === 'FAILED') {
    return 'is-error';
  }

  return 'is-gray';
}

function formatDate(iso: string, locale: 'ru' | 'en') {
  return new Date(iso).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(iso: string, locale: 'ru' | 'en') {
  return new Date(iso).toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export type BiometricPageInitialData = {
  employees: EmployeeOption[];
  result: string;
  reviews: BiometricReviewResponse | null;
};

export default function BiometricReviewPageClient({
  initialData,
}: {
  initialData?: BiometricPageInitialData | null;
}) {
  const { locale } = useI18n();
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeOption[]>(initialData?.employees ?? []);
  const [reviews, setReviews] = useState<BiometricReviewResponse | null>(initialData?.reviews ?? null);
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<string>(initialData?.result ?? '__all');
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'employeeName',
    direction: 'ascending',
  });
  const didUseInitialEmployees = useRef(Boolean(initialData?.employees?.length));
  const didUseInitialReviews = useRef(Boolean(initialData?.reviews) && (initialData?.result ?? '__all') === '__all');

  async function loadReviewData() {
    const session = getSession();
    if (!session) return;
    const searchParams = new URLSearchParams();
    if (result && result !== '__all') searchParams.set('result', result);

    const suffix = searchParams.toString();
    const snapshot = await apiRequest<BiometricPageInitialData>(
      `/bootstrap/biometric${suffix ? `?${suffix}` : ''}`,
      { token: session.accessToken },
    );
    setEmployees(snapshot.employees);
    setReviews(snapshot.reviews);
  }

  useEffect(() => {
    if (didUseInitialEmployees.current) {
      didUseInitialEmployees.current = false;
    }
  }, []);

  useEffect(() => {
    if (didUseInitialReviews.current && result === '__all') {
      didUseInitialReviews.current = false;
      return;
    }

    void loadReviewData().catch(() => {
      setReviews({ totals: { employees: 0, enrolled: 0, reviewRequired: 0, notEnrolled: 0 }, items: [] });
    });
  }, [result]);

  const failedCount = useMemo(
    () => reviews?.items.filter((item) => item.latestVerification?.result === 'FAILED').length ?? 0,
    [reviews],
  );

  const employeeDirectoryById = useMemo(
    () =>
      new Map(
        employees.map((employee) => [
          employee.id,
          {
            avatarUrl: employee.avatarUrl ?? null,
            department: employee.department?.name ?? null,
            location: employee.primaryLocation?.name ?? null,
          },
        ]),
      ),
    [employees],
  );

  const sortedItems = useMemo(() => {
    const collator = new Intl.Collator(locale === 'ru' ? 'ru' : 'en', {
      sensitivity: 'base',
      numeric: true,
    });
    const direction = sortDescriptor.direction === 'descending' ? -1 : 1;
    const enrollmentOrder = {
      ENROLLED: 0,
      PENDING: 1,
      NOT_STARTED: 2,
      FAILED: 3,
    } as const;
    const resultOrder = {
      PASSED: 0,
      REVIEW: 1,
      FAILED: 2,
      NONE: 3,
    } as const;

    return [...(reviews?.items ?? [])]
      .filter((item) => item.employeeName.toLowerCase().includes(search.trim().toLowerCase()))
      .sort((left, right) => {
      const leftReview = left.latestVerification;
      const rightReview = right.latestVerification;

      switch (sortDescriptor.column as BiometricSortColumn) {
        case 'enrollmentStatus':
          return (
            direction *
            ((enrollmentOrder[left.enrollmentStatus] - enrollmentOrder[right.enrollmentStatus]) ||
              collator.compare(left.employeeName, right.employeeName))
          );
        case 'lastScan':
          return (
            direction *
            (((leftReview ? new Date(leftReview.capturedAt).getTime() : 0) -
              (rightReview ? new Date(rightReview.capturedAt).getTime() : 0)) ||
              collator.compare(left.employeeName, right.employeeName))
          );
        case 'result':
          return (
            direction *
            ((resultOrder[leftReview?.result ?? 'NONE'] - resultOrder[rightReview?.result ?? 'NONE']) ||
              collator.compare(left.employeeName, right.employeeName))
          );
        case 'match':
          return (
            direction *
            (((leftReview?.matchScore ?? -1) - (rightReview?.matchScore ?? -1)) ||
              collator.compare(left.employeeName, right.employeeName))
          );
        case 'liveness':
          return (
            direction *
            (((leftReview?.livenessScore ?? -1) - (rightReview?.livenessScore ?? -1)) ||
              collator.compare(left.employeeName, right.employeeName))
          );
        case 'employeeName':
        default:
          return direction * collator.compare(left.employeeName, right.employeeName);
      }
    });
  }, [locale, reviews?.items, search, sortDescriptor]);

  function openEmployeeProfile(targetEmployeeId: string) {
    router.push(`/employees/${targetEmployeeId}`);
  }

function renderStatusChip(label: string, tone: string) {
  return (
    <span className={`team-tasks-employee-status ${tone}`}>
      <span className="team-tasks-employee-status-dot" aria-hidden="true" />
      {label}
    </span>
  );
}

function getEnrollmentStatusLabel(
  status: 'NOT_STARTED' | 'PENDING' | 'ENROLLED' | 'FAILED',
  locale: string,
) {
  if (locale === 'ru') {
    switch (status) {
      case 'ENROLLED':
        return 'Проверен';
      case 'NOT_STARTED':
        return 'Не проверен';
      case 'PENDING':
        return 'В ожидании';
      case 'FAILED':
      default:
        return 'Ошибка';
    }
  }

  switch (status) {
    case 'ENROLLED':
      return 'Verified';
    case 'NOT_STARTED':
      return 'Not verified';
    case 'PENDING':
      return 'Pending';
    case 'FAILED':
    default:
      return 'Failed';
  }
}

  return (
    <AdminShell>
      <main className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
        <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-5 overflow-hidden p-6">
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

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[280px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 w-full rounded-xl border-border bg-secondary/30 pl-9 font-heading"
              onChange={(event) => setSearch(event.target.value)}
              placeholder={locale === 'ru' ? 'Поиск сотрудника...' : 'Search employee...'}
              value={search}
            />
          </div>
          <div className="flex items-center gap-2">
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

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="team-tasks-table-card flex-1">
            <div className="team-tasks-table-shell">
              {sortedItems.length > 0 ? (
                <Table
                  aria-label={locale === 'ru' ? 'Таблица биометрии' : 'Biometric table'}
                  onSortChange={setSortDescriptor}
                  size="sm"
                  sortDescriptor={sortDescriptor}
                >
                  <Table.Header>
                    <Table.Head
                      allowsSorting
                      className="w-[34%] min-w-[320px]"
                      id="employeeName"
                      isRowHeader
                      label={locale === 'ru' ? 'ФИО' : 'Employee'}
                    />
                    <Table.Head
                      allowsSorting
                      className="w-[16%] min-w-[170px] team-tasks-head-center"
                      id="enrollmentStatus"
                      label={locale === 'ru' ? 'Статус' : 'Status'}
                    />
                    <Table.Head
                      allowsSorting
                      className="w-[16%] min-w-[170px] team-tasks-head-center"
                      id="lastScan"
                      label={locale === 'ru' ? 'Последний скан' : 'Last scan'}
                    />
                    <Table.Head
                      allowsSorting
                      className="w-[14%] min-w-[150px] team-tasks-head-center"
                      id="result"
                      label={locale === 'ru' ? 'Результат' : 'Result'}
                    />
                    <Table.Head
                      allowsSorting
                      className="w-[10%] min-w-[110px] team-tasks-head-center team-tasks-head-progress"
                      id="match"
                      label="Match"
                    />
                    <Table.Head
                      allowsSorting
                      className="w-[10%] min-w-[110px] team-tasks-head-center team-tasks-head-progress"
                      id="liveness"
                      label="Liveness"
                    />
                  </Table.Header>
                  <Table.Body items={sortedItems}>
                    {(item) => {
                      const employeeProfile = employeeDirectoryById.get(item.employeeId);
                      const employeeSubtitle = [item.department, item.location]
                        .filter((part) => part && part !== '—')
                        .join(' • ');

                      return (
                        <Table.Row className="team-tasks-table-row" id={item.employeeId}>
                          <Table.Cell className="align-middle">
                            <button
                              className="team-tasks-row-button team-tasks-row-button--identity"
                              onClick={() => openEmployeeProfile(item.employeeId)}
                              type="button"
                            >
                              <div className="flex items-center gap-3">
                                <Avatar
                                  alt={item.employeeName}
                                  className="shrink-0"
                                  initials={getEmployeeInitials(item.employeeName)}
                                  size="sm"
                                  src={employeeProfile?.avatarUrl || getMockAvatarDataUrl(item.employeeName)}
                                />
                                <div className="min-w-0 space-y-0.5">
                                  <p className="truncate text-base font-medium text-[color:var(--foreground)]">
                                    {item.employeeName}
                                  </p>
                                  <p className="truncate text-sm text-[color:var(--muted-foreground)]">
                                    {employeeSubtitle || item.department}
                                  </p>
                                </div>
                              </div>
                            </button>
                          </Table.Cell>

                          <Table.Cell className="align-middle whitespace-nowrap">
                            <button
                              className="team-tasks-row-button team-tasks-row-button--center"
                              onClick={() => openEmployeeProfile(item.employeeId)}
                              type="button"
                            >
                              {renderStatusChip(
                                getEnrollmentStatusLabel(item.enrollmentStatus, locale),
                                getBiometricTone(item.enrollmentStatus),
                              )}
                            </button>
                          </Table.Cell>

                          <Table.Cell className="align-middle whitespace-nowrap">
                            <button
                              className="team-tasks-row-button team-tasks-row-button--center"
                              onClick={() => openEmployeeProfile(item.employeeId)}
                              type="button"
                            >
                              <span className="team-tasks-team-text">
                                {item.latestVerification
                                  ? formatDateTime(item.latestVerification.capturedAt, locale)
                                  : '—'}
                              </span>
                            </button>
                          </Table.Cell>

                          <Table.Cell className="align-middle whitespace-nowrap">
                            <button
                              className="team-tasks-row-button team-tasks-row-button--center"
                              onClick={() => openEmployeeProfile(item.employeeId)}
                              type="button"
                            >
                              {item.latestVerification
                                ? renderStatusChip(
                                    item.latestVerification.result,
                                    getBiometricTone(item.latestVerification.result),
                                  )
                                : <span className="team-tasks-team-text is-empty">—</span>}
                            </button>
                          </Table.Cell>

                          <Table.Cell className="align-middle">
                            <button
                              className="team-tasks-row-button team-tasks-row-button--progress"
                              onClick={() => openEmployeeProfile(item.employeeId)}
                              type="button"
                            >
                              <strong className="text-[1.05rem] font-semibold text-[color:var(--foreground)]">
                                {item.latestVerification ? scoreLabel(item.latestVerification.matchScore) : '—'}
                              </strong>
                            </button>
                          </Table.Cell>

                          <Table.Cell className="align-middle">
                            <button
                              className="team-tasks-row-button team-tasks-row-button--progress"
                              onClick={() => openEmployeeProfile(item.employeeId)}
                              type="button"
                            >
                              <strong className="text-[1.05rem] font-semibold text-[color:var(--foreground)]">
                                {item.latestVerification ? scoreLabel(item.latestVerification.livenessScore) : '—'}
                              </strong>
                            </button>
                          </Table.Cell>
                        </Table.Row>
                      );
                    }}
                  </Table.Body>
                </Table>
              ) : (
                <div className="px-5 py-16 text-center text-sm text-muted-foreground">
                  <ScanFace className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  <p>{locale === 'ru' ? 'Нет данных' : 'No data'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </main>
    </AdminShell>
  );
}
