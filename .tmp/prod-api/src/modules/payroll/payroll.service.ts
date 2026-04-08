import { Injectable } from '@nestjs/common';
import { RequestStatus, RequestType, ShiftStatus } from '@prisma/client';
import PDFDocument = require('pdfkit');
import * as XLSX from 'xlsx';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHolidayCalendarDayDto } from './dto/create-holiday-calendar-day.dto';
import { UpdatePayrollPolicyDto } from './dto/update-payroll-policy.dto';

@Injectable()
export class PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async summary(tenantId: string, dateFrom?: string, dateTo?: string) {
    const range = this.resolveRange(dateFrom, dateTo);
    const policy = await this.getPolicy(tenantId);

    const [employees, shifts, sessions, requests, holidays] = await Promise.all([
      this.prisma.employee.findMany({
        where: { tenantId },
        include: {
          department: true,
          position: true,
        },
        orderBy: { employeeNumber: 'asc' },
      }),
      this.prisma.shift.findMany({
        where: {
          tenantId,
          shiftDate: {
            gte: range.start,
            lte: range.end,
          },
          status: {
            in: [ShiftStatus.PUBLISHED, ShiftStatus.COMPLETED],
          },
        },
      }),
      this.prisma.attendanceSession.findMany({
        where: {
          tenantId,
          startedAt: {
            gte: range.start,
            lte: range.end,
          },
        },
        include: {
          shift: true,
        },
      }),
      this.prisma.employeeRequest.findMany({
        where: {
          tenantId,
          status: RequestStatus.APPROVED,
          startsOn: {
            lte: range.end,
          },
          endsOn: {
            gte: range.start,
          },
          requestType: {
            in: [RequestType.LEAVE, RequestType.SICK_LEAVE],
          },
        },
      }),
      this.prisma.holidayCalendarDay.findMany({
        where: {
          tenantId,
          date: {
            gte: range.start,
            lte: range.end,
          },
        },
        orderBy: { date: 'asc' },
      }),
    ]);

    const holidayKeySet = new Set(holidays.map((holiday) => this.dateKeyLocal(holiday.date)));

    const rows = employees.map((employee) => {
      const employeeShifts = shifts.filter((shift) => shift.employeeId === employee.id);
      const employeeSessions = sessions.filter((session) => session.employeeId === employee.id);
      const employeeRequests = requests.filter((request) => request.employeeId === employee.id);

      const scheduledMinutes = employeeShifts.reduce((sum, shift) => sum + this.diffMinutes(shift.startsAt, shift.endsAt), 0);
      const rawWorkedMinutes = employeeSessions.reduce((sum, session) => sum + session.totalMinutes, 0);
      const breakMinutes = employeeSessions.reduce((sum, session) => sum + session.breakMinutes, 0);
      const workedMinutes = Math.max(0, rawWorkedMinutes - breakMinutes);
      const lateMinutes = employeeSessions.reduce((sum, session) => sum + session.lateMinutes, 0);
      const earlyLeaveMinutes = employeeSessions.reduce((sum, session) => sum + session.earlyLeaveMinutes, 0);
      const leaveDays = employeeRequests
        .filter((request) => request.requestType === RequestType.LEAVE)
        .reduce((sum, request) => sum + this.overlapDays(request.startsOn, request.endsOn, range.start, range.end), 0);
      const sickDays = employeeRequests
        .filter((request) => request.requestType === RequestType.SICK_LEAVE)
        .reduce((sum, request) => sum + this.overlapDays(request.startsOn, request.endsOn, range.start, range.end), 0);

      const buckets = employeeSessions.reduce(
        (acc, session) => {
          const endedAt = session.endedAt ?? new Date(session.startedAt.getTime() + session.totalMinutes * 60000);
          const scheduledForSession =
            session.shift ? this.diffMinutes(session.shift.startsAt, session.shift.endsAt) : policy.standardShiftMinutes;
          const nextBuckets = this.calculateSessionBuckets(
            session.startedAt,
            endedAt,
            scheduledForSession,
            session.breakMinutes,
            holidayKeySet,
            policy,
          );

          return {
            weekdayRegularMinutes: acc.weekdayRegularMinutes + nextBuckets.weekdayRegularMinutes,
            weekendRegularMinutes: acc.weekendRegularMinutes + nextBuckets.weekendRegularMinutes,
            holidayRegularMinutes: acc.holidayRegularMinutes + nextBuckets.holidayRegularMinutes,
            weekdayOvertimeMinutes: acc.weekdayOvertimeMinutes + nextBuckets.weekdayOvertimeMinutes,
            weekendOvertimeMinutes: acc.weekendOvertimeMinutes + nextBuckets.weekendOvertimeMinutes,
            holidayOvertimeMinutes: acc.holidayOvertimeMinutes + nextBuckets.holidayOvertimeMinutes,
            nightMinutes: acc.nightMinutes + nextBuckets.nightMinutes,
          };
        },
        {
          weekdayRegularMinutes: 0,
          weekendRegularMinutes: 0,
          holidayRegularMinutes: 0,
          weekdayOvertimeMinutes: 0,
          weekendOvertimeMinutes: 0,
          holidayOvertimeMinutes: 0,
          nightMinutes: 0,
        },
      );

      const regularMinutes = buckets.weekdayRegularMinutes;
      const weekendMinutes = buckets.weekendRegularMinutes;
      const holidayMinutes = buckets.holidayRegularMinutes;
      const overtimeMinutes = buckets.weekdayOvertimeMinutes;
      const weekendOvertimeMinutes = buckets.weekendOvertimeMinutes;
      const holidayOvertimeMinutes = buckets.holidayOvertimeMinutes;
      const nightMinutes = buckets.nightMinutes;

      const basePay = (regularMinutes / 60) * policy.baseHourlyRate;
      const weekendPay = (weekendMinutes / 60) * policy.baseHourlyRate * policy.weekendMultiplier;
      const holidayPay = (holidayMinutes / 60) * policy.baseHourlyRate * policy.holidayMultiplier;
      const overtimePay = (overtimeMinutes / 60) * policy.baseHourlyRate * policy.overtimeMultiplier;
      const weekendOvertimePay =
        (weekendOvertimeMinutes / 60) * policy.baseHourlyRate * policy.weekendOvertimeMultiplier;
      const holidayOvertimePay =
        (holidayOvertimeMinutes / 60) * policy.baseHourlyRate * policy.holidayOvertimeMultiplier;
      const nightPremiumPay = (nightMinutes / 60) * policy.baseHourlyRate * policy.nightPremiumMultiplier;
      const latenessPenalty = lateMinutes * policy.latenessPenaltyPerMinute;
      const earlyLeavePenalty = earlyLeaveMinutes * policy.earlyLeavePenaltyPerMinute;
      const leavePay = leaveDays * (policy.standardShiftMinutes / 60) * policy.baseHourlyRate * policy.leavePaidRatio;
      const sickPay = sickDays * (policy.standardShiftMinutes / 60) * policy.baseHourlyRate * policy.sickLeavePaidRatio;
      const estimatedGrossPay =
        basePay +
        weekendPay +
        holidayPay +
        overtimePay +
        weekendOvertimePay +
        holidayOvertimePay +
        nightPremiumPay +
        leavePay +
        sickPay -
        latenessPenalty -
        earlyLeavePenalty;

      return {
        employeeId: employee.id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        employeeNumber: employee.employeeNumber,
        department: employee.department.name,
        position: employee.position.name,
        scheduledMinutes,
        workedMinutes,
        rawWorkedMinutes,
        breakMinutes,
        regularMinutes,
        weekendMinutes,
        holidayMinutes,
        overtimeMinutes,
        weekendOvertimeMinutes,
        holidayOvertimeMinutes,
        nightMinutes,
        lateMinutes,
        earlyLeaveMinutes,
        leaveDays,
        sickDays,
        attendanceSessions: employeeSessions.length,
        assignedShifts: employeeShifts.length,
        basePay,
        weekendPay,
        holidayPay,
        overtimePay,
        weekendOvertimePay,
        holidayOvertimePay,
        nightPremiumPay,
        latenessPenalty,
        earlyLeavePenalty,
        leavePay,
        sickPay,
        estimatedGrossPay,
      };
    });

    return {
      policy,
      holidays: holidays.map((holiday) => ({
        id: holiday.id,
        name: holiday.name,
        date: holiday.date.toISOString(),
        isPaid: holiday.isPaid,
      })),
      range: {
        dateFrom: range.start.toISOString(),
        dateTo: range.end.toISOString(),
      },
      totals: {
        employees: rows.length,
        scheduledMinutes: rows.reduce((sum, row) => sum + row.scheduledMinutes, 0),
        workedMinutes: rows.reduce((sum, row) => sum + row.workedMinutes, 0),
        rawWorkedMinutes: rows.reduce((sum, row) => sum + row.rawWorkedMinutes, 0),
        breakMinutes: rows.reduce((sum, row) => sum + row.breakMinutes, 0),
        weekendMinutes: rows.reduce((sum, row) => sum + row.weekendMinutes, 0),
        holidayMinutes: rows.reduce((sum, row) => sum + row.holidayMinutes, 0),
        overtimeMinutes: rows.reduce((sum, row) => sum + row.overtimeMinutes, 0),
        weekendOvertimeMinutes: rows.reduce((sum, row) => sum + row.weekendOvertimeMinutes, 0),
        holidayOvertimeMinutes: rows.reduce((sum, row) => sum + row.holidayOvertimeMinutes, 0),
        nightMinutes: rows.reduce((sum, row) => sum + row.nightMinutes, 0),
        leaveDays: rows.reduce((sum, row) => sum + row.leaveDays, 0),
        sickDays: rows.reduce((sum, row) => sum + row.sickDays, 0),
        estimatedGrossPay: rows.reduce((sum, row) => sum + row.estimatedGrossPay, 0),
      },
      rows,
    };
  }

  async exportSummary(tenantId: string, actorUserId: string, format: 'csv' | 'xlsx' | 'pdf', dateFrom?: string, dateTo?: string) {
    const payload = await this.generateSummaryExportArtifact(tenantId, format, dateFrom, dateTo);
    const summary = payload.summary;

    await this.auditService.log({
      tenantId,
      actorUserId,
      entityType: 'payroll_summary',
      entityId: `${summary.range.dateFrom}:${summary.range.dateTo}`,
      action: 'payroll_summary.exported',
      metadata: {
        format,
        dateFrom: summary.range.dateFrom,
        dateTo: summary.range.dateTo,
        rows: summary.rows.length,
      },
    });

    return payload.file;
  }

  async generateSummaryExportArtifact(
    tenantId: string,
    format: 'csv' | 'xlsx' | 'pdf',
    dateFrom?: string,
    dateTo?: string,
  ) {
    const summary = await this.summary(tenantId, dateFrom, dateTo);
    const exportRows = summary.rows.map((row) => ({
      'Employee Number': row.employeeNumber,
      'Employee Name': row.employeeName,
      Department: row.department,
      Position: row.position,
      'Scheduled Hours': this.minutesToHours(row.scheduledMinutes),
      'Worked Hours': this.minutesToHours(row.workedMinutes),
      'Raw Worked Hours': this.minutesToHours(row.rawWorkedMinutes),
      'Break Hours': this.minutesToHours(row.breakMinutes),
      'Regular Hours': this.minutesToHours(row.regularMinutes),
      'Weekend Hours': this.minutesToHours(row.weekendMinutes),
      'Holiday Hours': this.minutesToHours(row.holidayMinutes),
      'Overtime Hours': this.minutesToHours(row.overtimeMinutes),
      'Weekend OT Hours': this.minutesToHours(row.weekendOvertimeMinutes),
      'Holiday OT Hours': this.minutesToHours(row.holidayOvertimeMinutes),
      'Night Hours': this.minutesToHours(row.nightMinutes),
      'Late Minutes': row.lateMinutes,
      'Early Leave Minutes': row.earlyLeaveMinutes,
      'Leave Days': row.leaveDays,
      'Sick Days': row.sickDays,
      Sessions: row.attendanceSessions,
      Shifts: row.assignedShifts,
      'Base Pay': this.roundMoney(row.basePay),
      'Weekend Pay': this.roundMoney(row.weekendPay),
      'Holiday Pay': this.roundMoney(row.holidayPay),
      'Overtime Pay': this.roundMoney(row.overtimePay),
      'Weekend OT Pay': this.roundMoney(row.weekendOvertimePay),
      'Holiday OT Pay': this.roundMoney(row.holidayOvertimePay),
      'Night Premium Pay': this.roundMoney(row.nightPremiumPay),
      'Lateness Penalty': this.roundMoney(row.latenessPenalty),
      'Early Leave Penalty': this.roundMoney(row.earlyLeavePenalty),
      'Leave Pay': this.roundMoney(row.leavePay),
      'Sick Pay': this.roundMoney(row.sickPay),
      'Estimated Gross Pay': this.roundMoney(row.estimatedGrossPay),
    }));
    const fileDate = `${summary.range.dateFrom.slice(0, 10)}_${summary.range.dateTo.slice(0, 10)}`;

    if (format === 'csv') {
      return {
        summary,
        file: {
          buffer: Buffer.from(this.toCsv(exportRows), 'utf-8'),
          fileName: `payroll_${fileDate}.csv`,
          contentType: 'text/csv; charset=utf-8',
        },
      };
    }

    if (format === 'pdf') {
      return {
        summary,
        file: {
          buffer: await this.buildPayrollPdf(summary),
          fileName: `payroll_${fileDate}.pdf`,
          contentType: 'application/pdf',
        },
      };
    }

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payroll');

    return {
      summary,
      file: {
        buffer: XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer,
        fileName: `payroll_${fileDate}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    };
  }

  async getPolicy(tenantId: string) {
    return this.prisma.payrollPolicy.upsert({
      where: { tenantId },
      update: {},
      create: {
        tenantId,
      },
    });
  }

  listHolidays(tenantId: string) {
    return this.prisma.holidayCalendarDay.findMany({
      where: { tenantId },
      orderBy: { date: 'asc' },
    });
  }

  async createHoliday(tenantId: string, actorUserId: string, dto: CreateHolidayCalendarDayDto) {
    const holidayDate = new Date(dto.date);
    holidayDate.setHours(0, 0, 0, 0);

    const holiday = await this.prisma.holidayCalendarDay.upsert({
      where: {
        tenantId_date: {
          tenantId,
          date: holidayDate,
        },
      },
      update: {
        name: dto.name,
        isPaid: dto.isPaid,
      },
      create: {
        tenantId,
        name: dto.name,
        date: holidayDate,
        isPaid: dto.isPaid,
      },
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      entityType: 'holiday_calendar_day',
      entityId: holiday.id,
      action: 'holiday_calendar_day.upserted',
      metadata: {
        date: holiday.date.toISOString(),
        isPaid: holiday.isPaid,
      },
    });

    return holiday;
  }

  async deleteHoliday(tenantId: string, actorUserId: string, holidayId: string) {
    const holiday = await this.prisma.holidayCalendarDay.findFirstOrThrow({
      where: {
        id: holidayId,
        tenantId,
      },
    });

    await this.prisma.holidayCalendarDay.delete({
      where: { id: holidayId },
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      entityType: 'holiday_calendar_day',
      entityId: holiday.id,
      action: 'holiday_calendar_day.deleted',
      metadata: {
        date: holiday.date.toISOString(),
      },
    });

    return { success: true };
  }

  async updatePolicy(tenantId: string, actorUserId: string, dto: UpdatePayrollPolicyDto) {
    const policy = await this.prisma.payrollPolicy.upsert({
      where: { tenantId },
      update: dto,
      create: {
        tenantId,
        ...dto,
      },
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      entityType: 'payroll_policy',
      entityId: policy.id,
      action: 'payroll_policy.updated',
      metadata: { ...dto },
    });

    return policy;
  }

  private calculateSessionBuckets(
    startedAt: Date,
    endedAt: Date,
    scheduledMinutes: number,
    breakMinutes: number,
    holidayKeySet: Set<string>,
    policy: {
      nightShiftStartLocal: string;
      nightShiftEndLocal: string;
    },
  ) {
    const totalWorkedMinutes = Math.max(0, this.diffMinutes(startedAt, endedAt) - breakMinutes);
    const regularMinutes = Math.min(totalWorkedMinutes, scheduledMinutes);
    const regularEnd = new Date(startedAt.getTime() + regularMinutes * 60000);

    const regularBuckets = this.classifyInterval(startedAt, regularEnd, holidayKeySet);
    const overtimeBuckets = this.classifyInterval(regularEnd, endedAt, holidayKeySet);
    const nightMinutes = this.calculateNightMinutes(
      startedAt,
      endedAt,
      policy.nightShiftStartLocal,
      policy.nightShiftEndLocal,
    );

    return {
      weekdayRegularMinutes: regularBuckets.weekdayMinutes,
      weekendRegularMinutes: regularBuckets.weekendMinutes,
      holidayRegularMinutes: regularBuckets.holidayMinutes,
      weekdayOvertimeMinutes: overtimeBuckets.weekdayMinutes,
      weekendOvertimeMinutes: overtimeBuckets.weekendMinutes,
      holidayOvertimeMinutes: overtimeBuckets.holidayMinutes,
      nightMinutes,
    };
  }

  private classifyInterval(start: Date, end: Date, holidayKeySet: Set<string>) {
    let cursor = new Date(start);
    const buckets = {
      weekdayMinutes: 0,
      weekendMinutes: 0,
      holidayMinutes: 0,
    };

    while (cursor < end) {
      const nextMidnight = this.startOfNextLocalDay(cursor);
      const segmentEnd = nextMidnight < end ? nextMidnight : end;
      const minutes = this.diffMinutes(cursor, segmentEnd);
      const dateKey = this.dateKeyLocal(cursor);

      if (holidayKeySet.has(dateKey)) {
        buckets.holidayMinutes += minutes;
      } else if (this.isWeekend(cursor)) {
        buckets.weekendMinutes += minutes;
      } else {
        buckets.weekdayMinutes += minutes;
      }

      cursor = segmentEnd;
    }

    return buckets;
  }

  private calculateNightMinutes(start: Date, end: Date, nightShiftStartLocal: string, nightShiftEndLocal: string) {
    const nightStartMinutes = this.parseTimeToMinutes(nightShiftStartLocal);
    const nightEndMinutes = this.parseTimeToMinutes(nightShiftEndLocal);

    let cursor = this.startOfLocalDay(new Date(start.getTime() - 86400000));
    const lastBoundary = this.startOfNextLocalDay(end);
    let totalNightMinutes = 0;

    while (cursor <= lastBoundary) {
      const windowStart = this.withMinutes(cursor, nightStartMinutes);
      const windowEnd = nightEndMinutes > nightStartMinutes
        ? this.withMinutes(cursor, nightEndMinutes)
        : this.withMinutes(new Date(cursor.getTime() + 86400000), nightEndMinutes);

      totalNightMinutes += this.overlapMinutes(start, end, windowStart, windowEnd);
      cursor = new Date(cursor.getTime() + 86400000);
    }

    return totalNightMinutes;
  }

  private overlapMinutes(start: Date, end: Date, rangeStart: Date, rangeEnd: Date) {
    const actualStart = start > rangeStart ? start : rangeStart;
    const actualEnd = end < rangeEnd ? end : rangeEnd;

    if (actualEnd <= actualStart) {
      return 0;
    }

    return this.diffMinutes(actualStart, actualEnd);
  }

  private resolveRange(dateFrom?: string, dateTo?: string) {
    const start = dateFrom ? new Date(dateFrom) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = dateTo ? new Date(dateTo) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  private diffMinutes(start: Date, end: Date) {
    return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  }

  private minutesToHours(minutes: number) {
    return Number((minutes / 60).toFixed(2));
  }

  private roundMoney(value: number) {
    return Number(value.toFixed(2));
  }

  private toCsv(rows: Array<Record<string, string | number>>) {
    if (rows.length === 0) {
      return '';
    }

    const headers = Object.keys(rows[0]);
    const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const lines = [
      headers.map(escape).join(','),
      ...rows.map((row) => headers.map((header) => escape(row[header] ?? '')).join(',')),
    ];

    return lines.join('\n');
  }

  private buildPayrollPdf(summary: Awaited<ReturnType<PayrollService['summary']>>) {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text('Payroll Summary', { align: 'left' });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#555').text(
        `${summary.range.dateFrom.slice(0, 10)} - ${summary.range.dateTo.slice(0, 10)}`,
      );
      doc.fillColor('#111');
      doc.moveDown();
      doc.fontSize(11).text(
        `Employees: ${summary.totals.employees} | Worked: ${this.minutesToHours(summary.totals.workedMinutes)}h | Overtime: ${this.minutesToHours(summary.totals.overtimeMinutes + summary.totals.weekendOvertimeMinutes + summary.totals.holidayOvertimeMinutes)}h | Gross: ${this.roundMoney(summary.totals.estimatedGrossPay)}`,
      );
      doc.moveDown();

      for (const row of summary.rows.slice(0, 40)) {
        doc.fontSize(11).text(`${row.employeeName} (${row.employeeNumber})`, { continued: true }).fontSize(10).text(`  ${row.department} / ${row.position}`);
        doc.fontSize(9).fillColor('#444').text(
          `Worked: ${this.minutesToHours(row.workedMinutes)}h | Breaks: ${this.minutesToHours(row.breakMinutes)}h | Night: ${this.minutesToHours(row.nightMinutes)}h | OT: ${this.minutesToHours(row.overtimeMinutes + row.weekendOvertimeMinutes + row.holidayOvertimeMinutes)}h | Gross: ${this.roundMoney(row.estimatedGrossPay)}`,
        );
        doc.text(
          `Base: ${this.roundMoney(row.basePay)} | Weekend: ${this.roundMoney(row.weekendPay)} | Holiday: ${this.roundMoney(row.holidayPay)} | Penalties: ${this.roundMoney(row.latenessPenalty + row.earlyLeavePenalty)}`,
        );
        doc.fillColor('#111');
        doc.moveDown(0.7);

        if (doc.y > 740) {
          doc.addPage();
        }
      }

      doc.end();
    });
  }

  private overlapDays(startsOn: Date, endsOn: Date, rangeStart: Date, rangeEnd: Date) {
    const start = startsOn > rangeStart ? startsOn : rangeStart;
    const end = endsOn < rangeEnd ? endsOn : rangeEnd;

    if (end < start) {
      return 0;
    }

    const startDay = new Date(start);
    startDay.setHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);

    return Math.floor((endDay.getTime() - startDay.getTime()) / 86400000) + 1;
  }

  private isWeekend(value: Date) {
    const day = value.getDay();
    return day === 0 || day === 6;
  }

  private parseTimeToMinutes(value: string) {
    const [hours, minutes] = value.split(':').map((item) => Number(item));
    return hours * 60 + minutes;
  }

  private withMinutes(baseDate: Date, totalMinutes: number) {
    const date = new Date(baseDate);
    date.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
    return date;
  }

  private startOfLocalDay(value: Date) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private startOfNextLocalDay(value: Date) {
    const date = this.startOfLocalDay(value);
    date.setDate(date.getDate() + 1);
    return date;
  }

  private dateKeyLocal(value: Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
