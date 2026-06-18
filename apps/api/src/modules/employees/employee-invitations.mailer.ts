import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LifecycleEmailService } from '../mail/lifecycle-email.service';

type EmailLocale = 'en' | 'ru';
type InvitationStatusEmail = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

type EmployeeEmailTemplate = {
  subject: string;
  preview: string;
  paragraphs: string[];
  ctaLabel?: string;
  ctaUrl?: string;
};

export type EmployeeEmailDeliveryResult = {
  status: 'accepted' | 'disabled' | 'failed' | 'no_recipient';
  provider: 'microsoft_graph' | 'resend' | 'none';
  recipients: string[];
  recordedAt: string;
  actionUrl?: string;
  errorMessage?: string;
};

const INVITATION_EMAIL_COPY: Record<
  EmailLocale,
  {
    subject: (companyName: string) => string;
    preview: string;
    paragraphs: (params: {
      companyName: string;
      tenantName: string;
    }) => string[];
    ctaLabel: string;
  }
> = {
  en: {
    subject: (companyName) => `${companyName} invited you to join HiTeam`,
    preview: 'Accept the invitation and finish your employee profile',
    paragraphs: ({ companyName, tenantName }) => [
      `${companyName} invited you to join ${tenantName}.`,
      'Open the invitation link and finish your employee profile.',
      'If the link does not open, ask your manager to send the invitation again.',
    ],
    ctaLabel: 'Accept invitation',
  },
  ru: {
    subject: (companyName) => `${companyName} приглашает вас присоединиться`,
    preview: 'Примите приглашение и заполните профиль сотрудника',
    paragraphs: ({ companyName, tenantName }) => [
      `Компания ${companyName} приглашает вас присоединиться к ${tenantName}.`,
      'Откройте ссылку приглашения и заполните профиль сотрудника.',
      'Если ссылка не открывается, попросите менеджера отправить приглашение повторно.',
    ],
    ctaLabel: 'Принять приглашение',
  },
};

function normalizeEmailLocale(locale?: string | null): EmailLocale {
  return locale?.trim().toLowerCase() === 'ru' ? 'ru' : 'en';
}

@Injectable()
export class EmployeeInvitationsMailerService {
  private readonly logger = new Logger(EmployeeInvitationsMailerService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly lifecycleEmailService: LifecycleEmailService,
  ) {}

  async sendInvitationEmail(params: {
    email: string;
    companyName: string;
    tenantName: string;
    token: string;
    locale?: string | null;
  }) {
    const locale = normalizeEmailLocale(params.locale);
    const inviteUrl = this.buildUrl(`/join/${params.token}`);
    const copy = INVITATION_EMAIL_COPY[locale];
    const result = await this.deliverEmail({
      email: params.email,
      locale,
      actionUrl: inviteUrl,
      template: {
        subject: copy.subject(params.companyName),
        preview: copy.preview,
        paragraphs: copy.paragraphs({
          companyName: params.companyName,
          tenantName: params.tenantName,
        }),
        ctaLabel: copy.ctaLabel,
        ctaUrl: inviteUrl,
      },
    });

    return this.requireAccepted(result, `Invitation email for ${params.email} was not delivered.`);
  }

  async sendManagerSetupEmail(params: {
    email: string;
    companyName: string;
    tenantName: string;
    setupUrl: string;
    locale?: string | null;
  }) {
    const locale = normalizeEmailLocale(params.locale);
    const result = await this.deliverEmail({
      email: params.email,
      locale,
      actionUrl: params.setupUrl,
      template: this.buildManagerSetupTemplate({
        companyName: params.companyName,
        tenantName: params.tenantName,
        setupUrl: params.setupUrl,
        locale,
      }),
    });

    return this.requireAccepted(result, `Manager setup email for ${params.email} was not delivered.`);
  }

  async sendInvitationStatusEmail(params: {
    email: string;
    companyName: string;
    tenantName: string;
    status: InvitationStatusEmail;
    rejectedReason?: string | null;
    locale?: string | null;
  }) {
    const locale = normalizeEmailLocale(params.locale);
    const actionUrl = params.status === 'APPROVED'
      ? this.buildUrl('/employee')
      : this.buildUrl('/login');

    return this.deliverEmail({
      email: params.email,
      locale,
      actionUrl,
      template: this.buildStatusTemplate({
        companyName: params.companyName,
        tenantName: params.tenantName,
        status: params.status,
        rejectedReason: params.rejectedReason,
        actionUrl,
        locale,
      }),
    });
  }

  async sendGeneratedCredentialsEmail(params: {
    email: string;
    companyName: string;
    tenantName: string;
    password: string;
    locale?: string | null;
  }) {
    const locale = normalizeEmailLocale(params.locale);
    const actionUrl = this.buildUrl('/login');

    return this.deliverEmail({
      email: params.email,
      locale,
      actionUrl,
      template: this.buildGeneratedCredentialsTemplate({
        companyName: params.companyName,
        tenantName: params.tenantName,
        email: params.email,
        password: params.password,
        actionUrl,
        locale,
      }),
    });
  }

  async sendInvitationSms(params: {
    phone: string;
    companyName: string;
    tenantName: string;
    token: string;
  }) {
    const inviteUrl = this.buildUrl(`/join/${params.token}`);

    // SMS provider is intentionally a stub for now. Wire Twilio/SMS.ru/etc here later.
    this.logger.warn(
      `SMS provider is not configured. Invitation for ${params.phone} (${params.companyName}/${params.tenantName}) logged only: ${inviteUrl}`,
    );

    return { provider: 'log', inviteUrl };
  }

  private async deliverEmail(params: {
    email: string;
    locale: EmailLocale;
    template: EmployeeEmailTemplate;
    actionUrl?: string;
  }): Promise<EmployeeEmailDeliveryResult> {
    const normalizedEmail = params.email.trim().toLowerCase();
    if (!normalizedEmail || normalizedEmail.endsWith('@smart.local')) {
      return this.buildDeliveryResult({
        status: 'no_recipient',
        provider: 'none',
        actionUrl: params.actionUrl,
        errorMessage: 'Recipient email is empty or internal.',
      });
    }

    const html = this.renderHtml(params.template, params.locale);
    const text = this.renderText(params.template);
    const graphResult = await this.lifecycleEmailService.sendTransactionalEmail({
      to: normalizedEmail,
      subject: params.template.subject,
      html,
      text,
    });

    if (graphResult.status === 'accepted') {
      return this.buildDeliveryResult({
        status: 'accepted',
        provider: graphResult.provider === 'resend' ? 'resend' : 'microsoft_graph',
        recipients: graphResult.recipients,
        actionUrl: params.actionUrl,
      });
    }

    const resendApiKey = this.configService.get<string>('RESEND_API_KEY')?.trim();
    if (!resendApiKey) {
      const errorMessage = graphResult.errorMessage
        ? `Microsoft Graph ${graphResult.status}: ${graphResult.errorMessage}. RESEND_API_KEY is not configured.`
        : `Microsoft Graph ${graphResult.status}. RESEND_API_KEY is not configured.`;
      this.logger.error(`Email for ${normalizedEmail} was not sent: ${errorMessage}`);
      return this.buildDeliveryResult({
        status: graphResult.status === 'disabled' ? 'disabled' : 'failed',
        provider: 'none',
        recipients: [normalizedEmail],
        actionUrl: params.actionUrl,
        errorMessage,
      });
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.resolveResendFrom(),
          to: [normalizedEmail],
          subject: params.template.subject,
          html,
          text,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        const errorMessage = `Resend rejected email: ${response.status} ${body}`;
        this.logger.error(`Email for ${normalizedEmail} was not sent: ${errorMessage}`);
        return this.buildDeliveryResult({
          status: 'failed',
          provider: 'resend',
          recipients: [normalizedEmail],
          actionUrl: params.actionUrl,
          errorMessage,
        });
      }

      return this.buildDeliveryResult({
        status: 'accepted',
        provider: 'resend',
        recipients: [normalizedEmail],
        actionUrl: params.actionUrl,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send email for ${normalizedEmail}: ${errorMessage}`);
      return this.buildDeliveryResult({
        status: 'failed',
        provider: 'resend',
        recipients: [normalizedEmail],
        actionUrl: params.actionUrl,
        errorMessage,
      });
    }
  }

  private requireAccepted(result: EmployeeEmailDeliveryResult, message: string) {
    if (result.status === 'accepted') {
      return result;
    }

    throw new ServiceUnavailableException(
      `${message} ${result.errorMessage ?? 'Email provider is not configured or rejected the message.'}`,
    );
  }

  private buildManagerSetupTemplate(params: {
    companyName: string;
    tenantName: string;
    setupUrl: string;
    locale: EmailLocale;
  }): EmployeeEmailTemplate {
    if (params.locale === 'ru') {
      return {
        subject: `Настройте ${params.companyName} в HiTeam`,
        preview: 'Откройте ссылку и завершите регистрацию менеджера',
        paragraphs: [
          `Для организации ${params.companyName} создан рабочий кабинет ${params.tenantName}.`,
          'Откройте ссылку и завершите профиль менеджера, чтобы начать настройку команды.',
          'Ссылка действует ограниченное время. Если она не открывается, создайте организацию заново или обратитесь к администратору.',
        ],
        ctaLabel: 'Открыть настройку',
        ctaUrl: params.setupUrl,
      };
    }

    return {
      subject: `Set up ${params.companyName} in HiTeam`,
      preview: 'Open the link and finish the manager profile',
      paragraphs: [
        `A HiTeam workspace was created for ${params.companyName}.`,
        'Open the setup link and finish the manager profile to start configuring the team.',
        'The link is time-limited. If it does not open, create the organization again or contact an administrator.',
      ],
      ctaLabel: 'Open setup',
      ctaUrl: params.setupUrl,
    };
  }

  private buildStatusTemplate(params: {
    companyName: string;
    tenantName: string;
    status: InvitationStatusEmail;
    rejectedReason?: string | null;
    actionUrl: string;
    locale: EmailLocale;
  }): EmployeeEmailTemplate {
    if (params.locale === 'ru') {
      if (params.status === 'APPROVED') {
        return {
          subject: 'Доступ к HiTeam открыт',
          preview: 'Руководитель подтвердил ваш профиль',
          paragraphs: [
            `Ваш профиль сотрудника в ${params.companyName} подтверждён.`,
            `Теперь у вас есть доступ к рабочему кабинету ${params.tenantName}.`,
          ],
          ctaLabel: 'Открыть кабинет',
          ctaUrl: params.actionUrl,
        };
      }

      if (params.status === 'REJECTED') {
        return {
          subject: 'Заявка сотрудника отклонена',
          preview: 'Руководитель отклонил вашу анкету',
          paragraphs: [
            `Ваша заявка сотрудника в ${params.companyName} отклонена.`,
            `Причина: ${params.rejectedReason?.trim() || 'заявка отклонена руководителем.'}`,
            'Если это ошибка, свяжитесь с менеджером вашей организации.',
          ],
          ctaLabel: 'Открыть HiTeam',
          ctaUrl: params.actionUrl,
        };
      }

      return {
        subject: 'Анкета HiTeam ждёт подтверждения',
        preview: 'Менеджер проверит ваш профиль',
        paragraphs: [
          `Ваш профиль сотрудника в ${params.companyName} отправлен на проверку.`,
          'Мы отправим новое письмо, когда руководитель подтвердит или отклонит заявку.',
        ],
        ctaLabel: 'Открыть HiTeam',
        ctaUrl: params.actionUrl,
      };
    }

    if (params.status === 'APPROVED') {
      return {
        subject: 'Your HiTeam access is open',
        preview: 'Your manager approved your profile',
        paragraphs: [
          `Your employee profile in ${params.companyName} was approved.`,
          `You now have access to the ${params.tenantName} workspace.`,
        ],
        ctaLabel: 'Open workspace',
        ctaUrl: params.actionUrl,
      };
    }

    if (params.status === 'REJECTED') {
      return {
        subject: 'Your employee request was rejected',
        preview: 'Your manager rejected the profile',
        paragraphs: [
          `Your employee request in ${params.companyName} was rejected.`,
          `Reason: ${params.rejectedReason?.trim() || 'the request was rejected by your manager.'}`,
          'If this is a mistake, contact your organization manager.',
        ],
        ctaLabel: 'Open HiTeam',
        ctaUrl: params.actionUrl,
      };
    }

    return {
      subject: 'Your HiTeam profile is waiting for approval',
      preview: 'Your manager will review your profile',
      paragraphs: [
        `Your employee profile in ${params.companyName} was submitted for review.`,
        'We will send another email when your manager approves or rejects the request.',
      ],
      ctaLabel: 'Open HiTeam',
      ctaUrl: params.actionUrl,
    };
  }

  private buildGeneratedCredentialsTemplate(params: {
    companyName: string;
    tenantName: string;
    email: string;
    password: string;
    actionUrl: string;
    locale: EmailLocale;
  }): EmployeeEmailTemplate {
    if (params.locale === 'ru') {
      return {
        subject: 'Доступ к HiTeam открыт',
        preview: 'Ваш менеджер создал профиль и временный пароль',
        paragraphs: [
          `Ваш профиль сотрудника в ${params.companyName} подтверждён.`,
          `Логин: ${params.email}`,
          `Временный пароль: ${params.password}`,
          `Используйте эти данные для входа в рабочий кабинет ${params.tenantName}. После входа замените пароль.`,
        ],
        ctaLabel: 'Войти в HiTeam',
        ctaUrl: params.actionUrl,
      };
    }

    return {
      subject: 'Your HiTeam access is open',
      preview: 'Your manager created a profile and temporary password',
      paragraphs: [
        `Your employee profile in ${params.companyName} was approved.`,
        `Login: ${params.email}`,
        `Temporary password: ${params.password}`,
        `Use these credentials to sign in to the ${params.tenantName} workspace. Change the password after signing in.`,
      ],
      ctaLabel: 'Sign in to HiTeam',
      ctaUrl: params.actionUrl,
    };
  }

  private renderHtml(template: EmployeeEmailTemplate, locale: EmailLocale) {
    const paragraphs = template.paragraphs
      .map((paragraph) => `<p style="margin:0 0 16px;color:#27313d;font-size:16px;line-height:1.55;">${this.escapeHtml(paragraph)}</p>`)
      .join('');
    const cta = template.ctaUrl && template.ctaLabel
      ? `<p style="margin:24px 0;"><a href="${this.escapeAttribute(template.ctaUrl)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;border-radius:6px;padding:12px 18px;font-size:15px;font-weight:700;">${this.escapeHtml(template.ctaLabel)}</a></p>`
      : '';

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
      `<h1 style="margin:10px 0 18px;color:#111827;font-size:24px;line-height:1.25;">${this.escapeHtml(template.subject)}</h1>`,
      paragraphs,
      cta,
      `<p style="margin:22px 0 0;color:#6b7280;font-size:13px;line-height:1.5;">${this.escapeHtml(locale === 'ru' ? 'Это письмо отправлено автоматически.' : 'This email was sent automatically.')}</p>`,
      '</td></tr>',
      '</table>',
      '</td></tr>',
      '</table>',
      '</body></html>',
    ].join('');
  }

  private renderText(template: EmployeeEmailTemplate) {
    return [
      template.subject,
      '',
      ...template.paragraphs,
      '',
      template.ctaUrl && template.ctaLabel ? `${template.ctaLabel}: ${template.ctaUrl}` : '',
    ].filter(Boolean).join('\n');
  }

  private buildDeliveryResult(params: {
    status: EmployeeEmailDeliveryResult['status'];
    provider: EmployeeEmailDeliveryResult['provider'];
    recipients?: string[];
    actionUrl?: string;
    errorMessage?: string;
  }): EmployeeEmailDeliveryResult {
    return {
      status: params.status,
      provider: params.provider,
      recipients: params.recipients ?? [],
      recordedAt: new Date().toISOString(),
      actionUrl: params.actionUrl,
      errorMessage: params.errorMessage,
    };
  }

  private buildUrl(path: string) {
    const baseUrl = (
      this.configService.get<string>('WEB_ADMIN_BASE_URL') ??
      this.configService.get<string>('APP_BASE_URL') ??
      'http://localhost:3000'
    ).replace(/\/$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    return `${baseUrl}${normalizedPath}`;
  }

  private resolveResendFrom() {
    const configuredFrom = this.configService.get<string>('EMAIL_FROM')?.trim();
    if (configuredFrom) {
      return configuredFrom;
    }

    const graphSender = this.configService.get<string>('MICROSOFT_GRAPH_SENDER')?.trim() || 'info@hiteam.net';
    return `HiTeam <${graphSender}>`;
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
