import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type EmailLocale = 'en' | 'ru';

const INVITATION_EMAIL_COPY: Record<
  EmailLocale,
  {
    subject: (companyName: string) => string;
    paragraphs: (params: {
      companyName: string;
      tenantName: string;
      inviteUrl: string;
    }) => string[];
  }
> = {
  en: {
    subject: (companyName) => `${companyName} invited you to join HiTeam`,
    paragraphs: ({ companyName, tenantName, inviteUrl }) => [
      `Company <strong>${companyName}</strong> invited you to join ${tenantName}.`,
      `<a href="${inviteUrl}">Accept invitation</a>`,
      'If the link does not open, ask your manager to send the invitation again.',
    ],
  },
  ru: {
    subject: (companyName) => `${companyName} приглашает вас присоединиться`,
    paragraphs: ({ companyName, tenantName, inviteUrl }) => [
      `Компания <strong>${companyName}</strong> приглашает вас присоединиться к ${tenantName}.`,
      `<a href="${inviteUrl}">Принять приглашение</a>`,
      'Если ссылка не открывается, попросите менеджера отправить приглашение повторно.',
    ],
  },
};

function normalizeEmailLocale(locale?: string | null): EmailLocale {
  return locale?.trim().toLowerCase() === 'ru' ? 'ru' : 'en';
}

@Injectable()
export class EmployeeInvitationsMailerService {
  private readonly logger = new Logger(EmployeeInvitationsMailerService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendInvitationEmail(params: {
    email: string;
    companyName: string;
    tenantName: string;
    token: string;
    locale?: string | null;
  }) {
    const baseUrl = (
      this.configService.get<string>('WEB_ADMIN_BASE_URL') ??
      this.configService.get<string>('APP_BASE_URL') ??
      'http://localhost:3000'
    ).replace(/\/$/, '');
    const inviteUrl = `${baseUrl}/join/${params.token}`;
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    const emailFrom = this.configService.get<string>('EMAIL_FROM', 'Smart <noreply@smart.local>');
    const copy = INVITATION_EMAIL_COPY[normalizeEmailLocale(params.locale)];
    const paragraphs = copy.paragraphs({
      companyName: params.companyName,
      tenantName: params.tenantName,
      inviteUrl,
    });

    if (!resendApiKey) {
      this.logger.warn(`RESEND_API_KEY is not configured. Invitation for ${params.email} logged only: ${inviteUrl}`);
      return { provider: 'log', inviteUrl };
    }

    let response: Response;

    try {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: emailFrom,
          to: [params.email],
          subject: copy.subject(params.companyName),
          html: paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join(''),
        }),
      });
    } catch (error) {
      this.logger.error(
        `Failed to send invitation email for ${params.email}: ${error instanceof Error ? error.message : String(error)}. Invitation link: ${inviteUrl}`,
      );
      return { provider: 'resend_failed', inviteUrl };
    }

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(
        `Resend rejected invitation email for ${params.email}: ${body}. Invitation link: ${inviteUrl}`,
      );
      return { provider: 'resend_failed', inviteUrl };
    }

    return { provider: 'resend', inviteUrl };
  }

  async sendInvitationSms(params: {
    phone: string;
    companyName: string;
    tenantName: string;
    token: string;
  }) {
    const baseUrl = (
      this.configService.get<string>('WEB_ADMIN_BASE_URL') ??
      this.configService.get<string>('APP_BASE_URL') ??
      'http://localhost:3000'
    ).replace(/\/$/, '');
    const inviteUrl = `${baseUrl}/join/${params.token}`;

    // SMS provider is intentionally a stub for now. Wire Twilio/SMS.ru/etc here later.
    this.logger.warn(
      `SMS provider is not configured. Invitation for ${params.phone} (${params.companyName}/${params.tenantName}) logged only: ${inviteUrl}`,
    );

    return { provider: 'log', inviteUrl };
  }
}
