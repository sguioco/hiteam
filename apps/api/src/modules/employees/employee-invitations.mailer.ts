import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmployeeInvitationsMailerService {
  private readonly logger = new Logger(EmployeeInvitationsMailerService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendInvitationEmail(params: {
    email: string;
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
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    const emailFrom = this.configService.get<string>('EMAIL_FROM', 'Smart <noreply@smart.local>');

    if (!resendApiKey) {
      this.logger.warn(`RESEND_API_KEY is not configured. Invitation for ${params.email} logged only: ${inviteUrl}`);
      return { provider: 'log', inviteUrl };
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [params.email],
        subject: `${params.companyName} приглашает вас присоединиться`,
        html: [
          `<p>Компания <strong>${params.companyName}</strong> приглашает вас присоединиться к ${params.tenantName}.</p>`,
          `<p><a href="${inviteUrl}">Принять приглашение</a></p>`,
          '<p>Если ссылка не открывается, попросите менеджера отправить приглашение повторно.</p>',
        ].join(''),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Resend rejected invitation email for ${params.email}: ${body}`);
      throw new InternalServerErrorException('Failed to send invitation email.');
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
