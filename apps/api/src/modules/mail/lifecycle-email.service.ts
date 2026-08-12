import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmployeeInvitationStatus, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type LifecycleEmailEvent =
  | 'user_registered'
  | 'trial_started'
  | 'activation_started'
  | 'trial_ending_soon'
  | 'trial_expired'
  | 'payment_successful'
  | 'payment_failed'
  | 'subscription_renewal_upcoming'
  | 'subscription_cancelled'
  | 'inactive_3_days'
  | 'key_feature_not_used';

type LifecycleEmailContext = {
  locale: EmailLocale;
  tenantName: string;
  companyName: string;
  dashboardUrl: string;
  billingUrl: string;
  employeesUrl: string;
  trialEndDate: string | null;
  renewalDate: string | null;
  paymentSummary: string | null;
  subscriptionPlan: string | null;
};

type LifecycleEmailTemplate = {
  subject: string;
  preview: string;
  paragraphs: string[];
  ctaLabel: string;
  ctaUrl: string;
};

type EmailLocale = 'en' | 'ru';

export type LifecycleEmailSendStatus =
  | 'disabled'
  | 'missing_tenant'
  | 'no_recipient'
  | 'accepted'
  | 'failed';

export type LifecycleEmailSendResult = {
  event: LifecycleEmailEvent;
  status: LifecycleEmailSendStatus;
  provider: 'disabled' | 'missing_tenant' | 'no_recipient' | 'microsoft_graph' | 'resend';
  sender: string;
  replyTo: string;
  recipients: string[];
  recipientCount: number;
  recordedAt: string;
  subject?: string;
  preview?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  dashboardUrl?: string;
  billingUrl?: string;
  employeesUrl?: string;
  errorMessage?: string;
};

export type TransactionalEmailSendStatus =
  | 'disabled'
  | 'no_recipient'
  | 'accepted'
  | 'failed';

export type TransactionalEmailSendResult = {
  status: TransactionalEmailSendStatus;
  provider: 'disabled' | 'no_recipient' | 'microsoft_graph' | 'resend';
  sender: string;
  replyTo: string;
  recipients: string[];
  recipientCount: number;
  recordedAt: string;
  subject?: string;
  errorMessage?: string;
};

type GraphTokenCache = {
  accessToken: string;
  expiresAt: number;
};

@Injectable()
export class LifecycleEmailService {
  private readonly logger = new Logger(LifecycleEmailService.name);
  private tokenCache: GraphTokenCache | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async sendLifecycleEmail(params: {
    tenantId: string;
    event: LifecycleEmailEvent;
  }): Promise<LifecycleEmailSendResult> {
    const sender = this.resolveSender();
    const replyTo = this.resolveReplyTo(sender);

    if (!this.isEnabled()) {
      return this.buildSendResult({
        event: params.event,
        status: 'disabled',
        provider: 'disabled',
        sender,
        replyTo,
      });
    }

    const snapshot = await this.loadEmailSnapshot(params.tenantId);
    if (!snapshot) {
      return this.buildSendResult({
        event: params.event,
        status: 'missing_tenant',
        provider: 'missing_tenant',
        sender,
        replyTo,
      });
    }

    const recipients = this.resolveRecipients(snapshot);
    const locale = this.resolveEmailLocale(snapshot);
    const context = this.buildContext(snapshot, locale);
    const template = this.buildTemplate(params.event, context);

    if (recipients.length === 0) {
      this.logger.warn(`Lifecycle email ${params.event} skipped for tenant ${params.tenantId}: no recipient.`);
      return this.buildSendResult({
        event: params.event,
        status: 'no_recipient',
        provider: 'no_recipient',
        sender,
        replyTo,
        template,
        context,
      });
    }

    try {
      const deliveryProvider = await this.sendWithConfiguredProvider({
        sender,
        replyTo,
        to: recipients,
        subject: template.subject,
        html: this.renderHtml(template, context),
        text: this.renderText(template, context),
      });

      return this.buildSendResult({
        event: params.event,
        status: 'accepted',
        provider: deliveryProvider,
        sender,
        replyTo,
        recipients,
        template,
        context,
      });
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.warn(`Lifecycle email ${params.event} failed for tenant ${params.tenantId}: ${errorMessage}`);

      return this.buildSendResult({
        event: params.event,
        status: 'failed',
        provider: this.resolveFailureProvider(),
        sender,
        replyTo,
        recipients,
        template,
        context,
        errorMessage,
      });
    }
  }

  async sendTransactionalEmail(params: {
    to: string | string[] | null | undefined;
    subject: string;
    html: string;
    text: string;
    replyTo?: string | null;
  }): Promise<TransactionalEmailSendResult> {
    const sender = this.resolveSender();
    const replyTo = params.replyTo?.trim() || this.resolveReplyTo(sender);
    const recipients = this.normalizeRecipientList(params.to);

    if (recipients.length === 0) {
      return this.buildTransactionalSendResult({
        status: 'no_recipient',
        provider: 'no_recipient',
        sender,
        replyTo,
        subject: params.subject,
      });
    }

    if (!this.isEnabled()) {
      return this.buildTransactionalSendResult({
        status: 'disabled',
        provider: 'disabled',
        sender,
        replyTo,
        recipients,
        subject: params.subject,
      });
    }

    try {
      const deliveryProvider = await this.sendWithConfiguredProvider({
        sender,
        replyTo,
        to: recipients,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });

      return this.buildTransactionalSendResult({
        status: 'accepted',
        provider: deliveryProvider,
        sender,
        replyTo,
        recipients,
        subject: params.subject,
      });
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.warn(`Transactional email failed for ${recipients.join(', ')}: ${errorMessage}`);

      return this.buildTransactionalSendResult({
        status: 'failed',
        provider: this.resolveFailureProvider(),
        sender,
        replyTo,
        recipients,
        subject: params.subject,
        errorMessage,
      });
    }
  }

  isEnabled() {
    const flag = this.configService.get<string>('LIFECYCLE_EMAILS_ENABLED')?.trim().toLowerCase();
    if (flag === 'false') {
      return false;
    }
    if (flag === 'true') {
      return true;
    }

    return this.hasConfiguredEmailProvider();
  }

  private async loadEmailSnapshot(tenantId: string) {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        locale: true,
        users: {
          where: {
            status: UserStatus.ACTIVE,
          },
          select: {
            email: true,
            preferredLocale: true,
            createdAt: true,
            roles: {
              select: {
                role: {
                  select: { code: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        companies: {
          select: { name: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
        employeeInvitations: {
          where: {
            status: EmployeeInvitationStatus.INVITED,
            email: { not: null },
          },
          select: {
            email: true,
            locale: true,
            invitedAt: true,
          },
          orderBy: { invitedAt: 'asc' },
          take: 5,
        },
        billingSubscription: {
          select: {
            trialEndsAt: true,
            stripeCurrentPeriodEnd: true,
            stripePriceLookupKey: true,
            stripeCurrency: true,
          },
        },
        billingPayments: {
          orderBy: { paidAt: 'desc' },
          take: 1,
          select: {
            amountMinor: true,
            currency: true,
            planMonths: true,
            accessMonths: true,
            targetSeats: true,
            periodEnd: true,
            paidAt: true,
          },
        },
      },
    });
  }

  private resolveRecipients(snapshot: NonNullable<Awaited<ReturnType<LifecycleEmailService['loadEmailSnapshot']>>>) {
    const emails = new Set<string>();
    const adminUsers = snapshot.users.filter((user) =>
      user.roles.some((entry) =>
        ['tenant_owner', 'hr_admin', 'operations_admin'].includes(entry.role.code),
      ),
    );
    const primaryUsers = adminUsers.length > 0 ? adminUsers : snapshot.users;

    for (const user of primaryUsers) {
      this.addRecipient(emails, user.email);
    }

    if (emails.size === 0) {
      for (const invitation of snapshot.employeeInvitations) {
        this.addRecipient(emails, invitation.email);
      }
    }

    return [...emails];
  }

  private resolveEmailLocale(
    snapshot: NonNullable<Awaited<ReturnType<LifecycleEmailService['loadEmailSnapshot']>>>,
  ): EmailLocale {
    const adminUsers = snapshot.users.filter((user) =>
      user.roles.some((entry) =>
        ['tenant_owner', 'hr_admin', 'operations_admin'].includes(entry.role.code),
      ),
    );
    const primaryUser = adminUsers[0] ?? snapshot.users[0] ?? null;
    const primaryInvitation = snapshot.employeeInvitations[0] ?? null;

    return this.normalizeEmailLocale(
      primaryUser?.preferredLocale ??
        primaryInvitation?.locale ??
        snapshot.locale,
    );
  }

  private addRecipient(recipients: Set<string>, email: string | null | undefined) {
    const normalized = email?.trim().toLowerCase();
    if (!normalized || normalized.endsWith('@smart.local')) {
      return;
    }

    recipients.add(normalized);
  }

  private normalizeRecipientList(value: string | string[] | null | undefined) {
    const emails = new Set<string>();
    const values = Array.isArray(value) ? value : [value];

    for (const item of values) {
      this.addRecipient(emails, item);
    }

    return [...emails];
  }

  private buildContext(
    snapshot: NonNullable<Awaited<ReturnType<LifecycleEmailService['loadEmailSnapshot']>>>,
    locale: EmailLocale,
  ): LifecycleEmailContext {
    const baseUrl = (
      this.configService.get<string>('WEB_ADMIN_BASE_URL') ??
      this.configService.get<string>('APP_BASE_URL') ??
      'http://localhost:3000'
    ).replace(/\/$/, '');
    const tenantQuery = snapshot.slug ? `?tenant=${encodeURIComponent(snapshot.slug)}` : '';
    const latestPayment = snapshot.billingPayments[0] ?? null;

    return {
      locale,
      tenantName: snapshot.name,
      companyName: snapshot.companies[0]?.name ?? snapshot.name,
      dashboardUrl: `${baseUrl}/app${tenantQuery}`,
      billingUrl: `${baseUrl}/billing${tenantQuery}`,
      employeesUrl: `${baseUrl}/employees${tenantQuery}`,
      trialEndDate: this.formatDate(snapshot.billingSubscription?.trialEndsAt ?? null, locale),
      renewalDate: this.formatDate(snapshot.billingSubscription?.stripeCurrentPeriodEnd ?? null, locale),
      paymentSummary: latestPayment ? this.formatPaymentSummary(latestPayment, snapshot, locale) : null,
      subscriptionPlan: this.formatSubscriptionPlan(latestPayment, snapshot),
    };
  }

  private formatPaymentSummary(
    payment: NonNullable<
      NonNullable<Awaited<ReturnType<LifecycleEmailService['loadEmailSnapshot']>>>['billingPayments'][number]
    >,
    snapshot: NonNullable<Awaited<ReturnType<LifecycleEmailService['loadEmailSnapshot']>>>,
    locale: EmailLocale,
  ) {
    const amount =
      payment.amountMinor !== null && payment.amountMinor !== undefined
        ? this.formatMoney(payment.amountMinor, payment.currency ?? snapshot.billingSubscription?.stripeCurrency ?? null, locale)
        : null;
    const plan = this.formatSubscriptionPlan(payment, snapshot);
    const paidUntil = this.formatDate(payment.periodEnd ?? snapshot.billingSubscription?.stripeCurrentPeriodEnd ?? null, locale);
    const seats = payment.targetSeats
      ? locale === 'ru'
        ? `${payment.targetSeats} мест`
        : `${payment.targetSeats} seats`
      : null;

    return [amount, plan, seats, paidUntil ? `${locale === 'ru' ? 'доступ до' : 'access until'} ${paidUntil}` : null]
      .filter(Boolean)
      .join(' · ');
  }

  private formatSubscriptionPlan(
    payment:
      | NonNullable<
          NonNullable<Awaited<ReturnType<LifecycleEmailService['loadEmailSnapshot']>>>['billingPayments'][number]
        >
      | null,
    snapshot: NonNullable<Awaited<ReturnType<LifecycleEmailService['loadEmailSnapshot']>>>,
  ) {
    if (payment?.planMonths) {
      const label =
        payment.planMonths === 12
          ? 'Annual'
          : payment.planMonths === 6
            ? 'Semi Annual'
            : 'Monthly';
      return payment.accessMonths
        ? `${label}: pay ${payment.planMonths} mo, access ${payment.accessMonths} mo`
        : `${label}: pay ${payment.planMonths} mo`;
    }

    return snapshot.billingSubscription?.stripePriceLookupKey ?? null;
  }

  private formatMoney(amountMinor: number, currency: string | null, locale: EmailLocale) {
    const normalizedCurrency = currency?.trim().toUpperCase();
    if (!normalizedCurrency) {
      return (amountMinor / 100).toFixed(2).replace(/\.00$/, '');
    }

    return new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
      currency: normalizedCurrency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
      style: 'currency',
    }).format(amountMinor / 100);
  }

  private buildTemplate(event: LifecycleEmailEvent, context: LifecycleEmailContext): LifecycleEmailTemplate {
    if (context.locale === 'en') {
      return this.buildEnglishTemplate(event, context);
    }

    switch (event) {
      case 'user_registered':
        return {
          subject: 'Добро пожаловать в HiTeam',
          preview: 'Ваш рабочий кабинет создан',
          paragraphs: [
            `Здравствуйте! Мы создали рабочий кабинет для ${context.companyName}`,
            'Можно переходить к настройке команды, локаций и первого check-in',
          ],
          ctaLabel: 'Открыть HiTeam',
          ctaUrl: context.dashboardUrl,
        };
      case 'trial_started':
        return {
          subject: 'Ваш trial HiTeam начался',
          preview: 'Пробный период уже активен',
          paragraphs: [
            'Пробный период HiTeam активен. За это время можно проверить учёт смен, сотрудников и check-in',
            'Лучший первый шаг - добавить сотрудников и настроить основную локацию',
          ],
          ctaLabel: 'Добавить сотрудников',
          ctaUrl: context.employeesUrl,
        };
      case 'trial_ending_soon':
        return {
          subject: 'Trial заканчивается скоро',
          preview: `Пробный период заканчивается ${context.trialEndDate ?? 'скоро'}`,
          paragraphs: [
            `Пробный период HiTeam заканчивается ${context.trialEndDate ?? 'в ближайшие дни'}`,
            'Чтобы команда продолжила работу без паузы, проверьте подписку и способ оплаты заранее',
          ],
          ctaLabel: 'Открыть оплату',
          ctaUrl: context.billingUrl,
        };
      case 'trial_expired':
        return {
          subject: 'Trial HiTeam завершён',
          preview: 'Пробный период закончился',
          paragraphs: [
            'Пробный период HiTeam завершён. Данные вашей команды сохранены',
            'Чтобы продолжить работу без ограничений, активируйте подписку в разделе Billing',
          ],
          ctaLabel: 'Активировать подписку',
          ctaUrl: context.billingUrl,
        };
      case 'payment_successful':
        return {
          subject: 'Оплата HiTeam прошла успешно',
          preview: 'Подписка активна',
          paragraphs: [
            'Спасибо, оплата получена',
            ...(context.paymentSummary ? [`Платёж: ${context.paymentSummary}`] : []),
            ...(context.subscriptionPlan ? [`Тариф: ${context.subscriptionPlan}`] : []),
            'Подписка HiTeam активна, команда может продолжать работу без ограничений',
          ],
          ctaLabel: 'Открыть кабинет',
          ctaUrl: context.dashboardUrl,
        };
      case 'payment_failed':
        return {
          subject: 'Не удалось провести оплату HiTeam',
          preview: 'Проверьте способ оплаты',
          paragraphs: [
            'Платёж по подписке HiTeam не прошёл',
            'Проверьте карту или способ оплаты, чтобы доступ команды не прерывался',
          ],
          ctaLabel: 'Проверить оплату',
          ctaUrl: context.billingUrl,
        };
      case 'subscription_renewal_upcoming':
        return {
          subject: 'Скоро продление подписки HiTeam',
          preview: `Подписка будет продлена ${context.renewalDate ?? 'скоро'}`,
          paragraphs: [
            `Подписка HiTeam будет продлена ${context.renewalDate ?? 'в ближайшие дни'}`,
            'Проверьте способ оплаты и количество сотрудников до даты продления',
          ],
          ctaLabel: 'Открыть Billing',
          ctaUrl: context.billingUrl,
        };
      case 'subscription_cancelled':
        return {
          subject: 'Подписка HiTeam отменена',
          preview: 'Подписка больше не будет продлеваться',
          paragraphs: [
            'Подписка HiTeam отменена и больше не будет продлеваться автоматически',
            'Если это ошибка, восстановите оплату или напишите нам - поможем вернуть доступ',
          ],
          ctaLabel: 'Открыть Billing',
          ctaUrl: context.billingUrl,
        };
      case 'inactive_3_days':
        return {
          subject: 'Нужна помощь с запуском HiTeam?',
          preview: 'В кабинете не было активности 3 дня',
          paragraphs: [
            'Мы заметили, что в кабинете HiTeam не было активности 3 дня',
            'Если нужна помощь, начните с добавления сотрудников и первой локации - это быстрее всего запускает систему в работу',
          ],
          ctaLabel: 'Продолжить настройку',
          ctaUrl: context.dashboardUrl,
        };
      case 'key_feature_not_used':
        return {
          subject: 'Завершите первый шаг в HiTeam',
          preview: 'Добавьте сотрудников или сделайте первый check-in',
          paragraphs: [
            'Похоже, ключевой первый шаг ещё не завершён: сотрудники не добавлены или первый check-in не выполнен',
            'Добавьте команду, чтобы увидеть полный эффект от учёта смен и посещаемости',
          ],
          ctaLabel: 'Добавить сотрудников',
          ctaUrl: context.employeesUrl,
        };
      case 'activation_started':
      default:
        return {
          subject: 'Настройка HiTeam началась',
          preview: 'Вы сделали первый шаг в продукте',
          paragraphs: [
            'Вы начали настройку HiTeam. Следующий шаг - довести команду и локации до рабочего состояния',
            'Откройте кабинет и продолжите настройку',
          ],
          ctaLabel: 'Открыть HiTeam',
          ctaUrl: context.dashboardUrl,
        };
    }
  }

  private buildEnglishTemplate(event: LifecycleEmailEvent, context: LifecycleEmailContext): LifecycleEmailTemplate {
    switch (event) {
      case 'user_registered':
        return {
          subject: 'Welcome to HiTeam',
          preview: 'Your workspace is ready',
          paragraphs: [
            `Hi! We created the workspace for ${context.companyName}`,
            'You can now set up your team, locations, and the first check-in',
          ],
          ctaLabel: 'Open HiTeam',
          ctaUrl: context.dashboardUrl,
        };
      case 'trial_started':
        return {
          subject: 'Your HiTeam trial has started',
          preview: 'The trial period is active',
          paragraphs: [
            'Your HiTeam trial is active. Use this time to test shift tracking, employees, and check-ins',
            'The best first step is to add employees and set up your main location',
          ],
          ctaLabel: 'Add employees',
          ctaUrl: context.employeesUrl,
        };
      case 'trial_ending_soon':
        return {
          subject: 'Your trial is ending soon',
          preview: `The trial ends ${context.trialEndDate ?? 'soon'}`,
          paragraphs: [
            `Your HiTeam trial ends ${context.trialEndDate ?? 'in the next few days'}`,
            'To keep the team running without a pause, check your subscription and payment method in advance',
          ],
          ctaLabel: 'Open billing',
          ctaUrl: context.billingUrl,
        };
      case 'trial_expired':
        return {
          subject: 'Your HiTeam trial has ended',
          preview: 'The trial period is over',
          paragraphs: [
            'Your HiTeam trial has ended. Your team data is saved',
            'To continue without limits, activate the subscription in Billing',
          ],
          ctaLabel: 'Activate subscription',
          ctaUrl: context.billingUrl,
        };
      case 'payment_successful':
        return {
          subject: 'HiTeam payment successful',
          preview: 'Your subscription is active',
          paragraphs: [
            'Thank you, the payment was received',
            ...(context.paymentSummary ? [`Payment: ${context.paymentSummary}`] : []),
            ...(context.subscriptionPlan ? [`Plan: ${context.subscriptionPlan}`] : []),
            'Your HiTeam subscription is active and the team can continue working without limits',
          ],
          ctaLabel: 'Open workspace',
          ctaUrl: context.dashboardUrl,
        };
      case 'payment_failed':
        return {
          subject: 'HiTeam payment failed',
          preview: 'Check your payment method',
          paragraphs: [
            'The HiTeam subscription payment did not go through',
            'Check your card or payment method so the team access does not pause',
          ],
          ctaLabel: 'Check payment',
          ctaUrl: context.billingUrl,
        };
      case 'subscription_renewal_upcoming':
        return {
          subject: 'HiTeam subscription renews soon',
          preview: `The subscription renews ${context.renewalDate ?? 'soon'}`,
          paragraphs: [
            `Your HiTeam subscription renews ${context.renewalDate ?? 'in the next few days'}`,
            'Check the payment method and employee count before the renewal date',
          ],
          ctaLabel: 'Open Billing',
          ctaUrl: context.billingUrl,
        };
      case 'subscription_cancelled':
        return {
          subject: 'HiTeam subscription cancelled',
          preview: 'The subscription will no longer renew',
          paragraphs: [
            'Your HiTeam subscription was cancelled and will no longer renew automatically',
            'If this was a mistake, restore payment or contact us and we will help return access',
          ],
          ctaLabel: 'Open Billing',
          ctaUrl: context.billingUrl,
        };
      case 'inactive_3_days':
        return {
          subject: 'Need help launching HiTeam?',
          preview: 'There has been no workspace activity for 3 days',
          paragraphs: [
            'We noticed there has been no activity in your HiTeam workspace for 3 days',
            'If you need help, start by adding employees and your first location. That is the fastest way to launch the system',
          ],
          ctaLabel: 'Continue setup',
          ctaUrl: context.dashboardUrl,
        };
      case 'key_feature_not_used':
        return {
          subject: 'Complete the first step in HiTeam',
          preview: 'Add employees or complete the first check-in',
          paragraphs: [
            'It looks like the key first step is not complete yet: employees are not added or the first check-in has not happened',
            'Add your team to see the full effect of shift and attendance tracking',
          ],
          ctaLabel: 'Add employees',
          ctaUrl: context.employeesUrl,
        };
      case 'activation_started':
      default:
        return {
          subject: 'HiTeam setup has started',
          preview: 'You made the first product step',
          paragraphs: [
            'You started setting up HiTeam. The next step is to bring your team and locations to a working state',
            'Open the workspace and continue setup',
          ],
          ctaLabel: 'Open HiTeam',
          ctaUrl: context.dashboardUrl,
        };
    }
  }

  private renderHtml(template: LifecycleEmailTemplate, context: LifecycleEmailContext) {
    const escapedSubject = this.escapeHtml(template.subject);
    const paragraphs = template.paragraphs
      .map((paragraph) => `<p style="margin:0 0 16px;color:#27313d;font-size:16px;line-height:1.55;">${this.escapeHtml(paragraph)}</p>`)
      .join('');

    return [
      '<!doctype html>',
      '<html><body style="margin:0;background:#f5f7fb;font-family:Arial,sans-serif;">',
      '<div style="display:none;max-height:0;overflow:hidden;">',
      this.escapeHtml(template.preview),
      '</div>',
      '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7fb;padding:32px 16px;">',
      '<tr><td align="center">',
      '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e5e9f0;border-radius:8px;">',
      '<tr><td style="padding:28px 28px 10px;">',
      '<div style="color:#6b7280;font-size:13px;letter-spacing:.08em;text-transform:uppercase;">HiTeam</div>',
      `<h1 style="margin:10px 0 18px;color:#111827;font-size:24px;line-height:1.25;">${escapedSubject}</h1>`,
      paragraphs,
      `<p style="margin:24px 0;"><a href="${this.escapeAttribute(template.ctaUrl)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;border-radius:6px;padding:12px 18px;font-size:15px;font-weight:700;">${this.escapeHtml(template.ctaLabel)}</a></p>`,
      `<p style="margin:22px 0 0;color:#6b7280;font-size:13px;line-height:1.5;">${this.escapeHtml(context.locale === 'ru' ? 'Компания' : 'Company')}: ${this.escapeHtml(context.companyName)}</p>`,
      '</td></tr>',
      '</table>',
      '</td></tr>',
      '</table>',
      '</body></html>',
    ].join('');
  }

  private renderText(template: LifecycleEmailTemplate, context: LifecycleEmailContext) {
    return [
      template.subject,
      '',
      ...template.paragraphs,
      '',
      `${template.ctaLabel}: ${template.ctaUrl}`,
      '',
      `${context.locale === 'ru' ? 'Компания' : 'Company'}: ${context.companyName}`,
    ].join('\n');
  }

  private async sendWithMicrosoftGraph(params: {
    sender: string;
    replyTo: string;
    to: string[];
    subject: string;
    html: string;
    text: string;
  }) {
    const token = await this.getAccessToken();
    const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(params.sender)}/sendMail`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          subject: params.subject,
          body: {
            contentType: 'HTML',
            content: params.html,
          },
          toRecipients: params.to.map((address) => ({
            emailAddress: { address },
          })),
          replyTo: [
            {
              emailAddress: {
                address: params.replyTo,
              },
            },
          ],
        },
        saveToSentItems: true,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Microsoft Graph sendMail rejected lifecycle email: ${response.status} ${body}`);
    }
  }

  private async sendWithResend(params: {
    sender: string;
    replyTo: string;
    to: string[];
    subject: string;
    html: string;
    text: string;
  }) {
    const apiKey = this.requireConfig('RESEND_API_KEY');
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.resolveResendFrom(params.sender),
        reply_to: params.replyTo,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Resend rejected email: ${response.status} ${body}`);
    }
  }

  private async sendWithConfiguredProvider(params: {
    sender: string;
    replyTo: string;
    to: string[];
    subject: string;
    html: string;
    text: string;
  }): Promise<'microsoft_graph' | 'resend'> {
    const errors: string[] = [];

    const preferredProvider = this.configService
      .get<string>('EMAIL_DELIVERY_PROVIDER')
      ?.trim()
      .toLowerCase();
    const providers = preferredProvider === 'resend'
      ? ['resend', 'microsoft_graph'] as const
      : ['microsoft_graph', 'resend'] as const;

    for (const provider of providers) {
      if (provider === 'microsoft_graph' && this.isGraphConfigured()) {
        try {
          await this.sendWithMicrosoftGraph(params);
          return 'microsoft_graph';
        } catch (error) {
          errors.push(`Microsoft Graph: ${this.getErrorMessage(error)}`);
        }
      }

      if (provider === 'resend' && this.isResendConfigured()) {
        try {
          await this.sendWithResend(params);
          return 'resend';
        } catch (error) {
          errors.push(`Resend: ${this.getErrorMessage(error)}`);
        }
      }
    }

    throw new Error(errors.length ? errors.join(' | ') : 'No email provider is configured.');
  }

  private buildSendResult(params: {
    event: LifecycleEmailEvent;
    status: LifecycleEmailSendStatus;
    provider: LifecycleEmailSendResult['provider'];
    sender: string;
    replyTo: string;
    recipients?: string[];
    template?: LifecycleEmailTemplate;
    context?: LifecycleEmailContext;
    errorMessage?: string;
  }): LifecycleEmailSendResult {
    const recipients = params.recipients ?? [];

    return {
      event: params.event,
      status: params.status,
      provider: params.provider,
      sender: params.sender,
      replyTo: params.replyTo,
      recipients,
      recipientCount: recipients.length,
      recordedAt: new Date().toISOString(),
      subject: params.template?.subject,
      preview: params.template?.preview,
      ctaLabel: params.template?.ctaLabel,
      ctaUrl: params.template?.ctaUrl,
      dashboardUrl: params.context?.dashboardUrl,
      billingUrl: params.context?.billingUrl,
      employeesUrl: params.context?.employeesUrl,
      errorMessage: params.errorMessage,
    };
  }

  private buildTransactionalSendResult(params: {
    status: TransactionalEmailSendStatus;
    provider: TransactionalEmailSendResult['provider'];
    sender: string;
    replyTo: string;
    recipients?: string[];
    subject?: string;
    errorMessage?: string;
  }): TransactionalEmailSendResult {
    const recipients = params.recipients ?? [];

    return {
      status: params.status,
      provider: params.provider,
      sender: params.sender,
      replyTo: params.replyTo,
      recipients,
      recipientCount: recipients.length,
      recordedAt: new Date().toISOString(),
      subject: params.subject,
      errorMessage: params.errorMessage,
    };
  }

  private resolveSender() {
    return this.configService.get<string>('MICROSOFT_GRAPH_SENDER')?.trim() || 'info@hiteam.net';
  }

  private resolveReplyTo(sender: string) {
    return this.configService.get<string>('LIFECYCLE_EMAIL_REPLY_TO')?.trim() || sender;
  }

  private resolveResendFrom(sender: string) {
    const configuredFrom = this.configService.get<string>('EMAIL_FROM')?.trim();
    return configuredFrom || `HiTeam <${sender}>`;
  }

  private async getAccessToken() {
    const cached = this.tokenCache;
    if (cached && cached.expiresAt > Date.now() + 60_000) {
      return cached.accessToken;
    }

    const tenantId = this.requireConfig('MICROSOFT_GRAPH_TENANT_ID');
    const clientId = this.requireConfig('MICROSOFT_GRAPH_CLIENT_ID');
    const clientSecret = this.requireConfig('MICROSOFT_GRAPH_CLIENT_SECRET');
    const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
        scope: 'https://graph.microsoft.com/.default',
      }),
    });

    const body = await response.json().catch(() => null) as { access_token?: string; expires_in?: number; error_description?: string } | null;
    if (!response.ok || !body?.access_token) {
      throw new Error(`Microsoft Graph token request failed: ${response.status} ${body?.error_description ?? 'no access token'}`);
    }

    this.tokenCache = {
      accessToken: body.access_token,
      expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
    };

    return body.access_token;
  }

  private requireConfig(key: string) {
    const value = this.configService.get<string>(key)?.trim();
    if (!value) {
      throw new Error(`${key} is not configured.`);
    }

    return value;
  }

  private isGraphConfigured() {
    return Boolean(
      this.configService.get<string>('MICROSOFT_GRAPH_TENANT_ID')?.trim() &&
        this.configService.get<string>('MICROSOFT_GRAPH_CLIENT_ID')?.trim() &&
        this.configService.get<string>('MICROSOFT_GRAPH_CLIENT_SECRET')?.trim(),
    );
  }

  private isResendConfigured() {
    return Boolean(this.configService.get<string>('RESEND_API_KEY')?.trim());
  }

  private hasConfiguredEmailProvider() {
    return this.isGraphConfigured() || this.isResendConfigured();
  }

  private resolveFailureProvider(): 'disabled' | 'microsoft_graph' | 'resend' {
    if (this.isGraphConfigured()) {
      return 'microsoft_graph';
    }

    if (this.isResendConfigured()) {
      return 'resend';
    }

    return 'disabled';
  }

  private getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }

  private normalizeEmailLocale(locale?: string | null): EmailLocale {
    return locale?.trim().toLowerCase() === 'ru' ? 'ru' : 'en';
  }

  private formatDate(value: Date | null, locale: EmailLocale) {
    if (!value) {
      return null;
    }

    return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(value);
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private escapeAttribute(value: string) {
    return this.escapeHtml(value);
  }
}
