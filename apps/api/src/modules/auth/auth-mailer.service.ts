import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LifecycleEmailService,
  type TransactionalEmailSendResult,
} from '../mail/lifecycle-email.service';

type EmailLocale = 'en' | 'ru';

@Injectable()
export class AuthMailerService {
  constructor(
    private readonly configService: ConfigService,
    private readonly lifecycleEmailService: LifecycleEmailService,
  ) {}

  async sendPasswordResetEmail(params: {
    email: string;
    resetToken: string;
    locale?: string | null;
  }): Promise<TransactionalEmailSendResult> {
    const locale = this.normalizeEmailLocale(params.locale);
    const resetUrl = this.buildUrl(
      `/reset-password?token=${encodeURIComponent(params.resetToken)}`,
    );
    const template = this.buildPasswordResetTemplate({ locale, resetUrl });

    return this.lifecycleEmailService.sendTransactionalEmail({
      to: params.email,
      subject: template.subject,
      html: this.renderHtml(template, locale),
      text: this.renderText(template),
    });
  }

  async sendPasswordChangedEmail(params: {
    email: string;
    locale?: string | null;
  }): Promise<TransactionalEmailSendResult> {
    const locale = this.normalizeEmailLocale(params.locale);
    const loginUrl = this.buildUrl('/login');
    const template = this.buildPasswordChangedTemplate({ locale, loginUrl });

    return this.lifecycleEmailService.sendTransactionalEmail({
      to: params.email,
      subject: template.subject,
      html: this.renderHtml(template, locale),
      text: this.renderText(template),
    });
  }

  private buildPasswordResetTemplate(params: {
    locale: EmailLocale;
    resetUrl: string;
  }) {
    if (params.locale === 'ru') {
      return {
        subject: 'Восстановление пароля HiTeam',
        preview: 'Откройте ссылку и задайте новый пароль',
        paragraphs: [
          'Мы получили запрос на восстановление пароля для вашего аккаунта HiTeam.',
          'Откройте ссылку ниже и задайте новый пароль. Ссылка действует 30 минут.',
          'Если вы не запрашивали восстановление, просто проигнорируйте это письмо.',
        ],
        ctaLabel: 'Сбросить пароль',
        ctaUrl: params.resetUrl,
      };
    }

    return {
      subject: 'Reset your HiTeam password',
      preview: 'Open the link and choose a new password',
      paragraphs: [
        'We received a request to reset the password for your HiTeam account.',
        'Open the link below and choose a new password. This link is valid for 30 minutes.',
        'If you did not request this, you can ignore this email.',
      ],
      ctaLabel: 'Reset password',
      ctaUrl: params.resetUrl,
    };
  }

  private buildPasswordChangedTemplate(params: {
    locale: EmailLocale;
    loginUrl: string;
  }) {
    if (params.locale === 'ru') {
      return {
        subject: 'Пароль HiTeam изменён',
        preview: 'Ваш пароль был успешно обновлён',
        paragraphs: [
          'Пароль вашего аккаунта HiTeam был успешно изменён.',
          'Если это были не вы, немедленно свяжитесь с администратором вашей организации.',
        ],
        ctaLabel: 'Войти в HiTeam',
        ctaUrl: params.loginUrl,
      };
    }

    return {
      subject: 'Your HiTeam password was changed',
      preview: 'Your password was updated successfully',
      paragraphs: [
        'The password for your HiTeam account was changed successfully.',
        'If this was not you, contact your organization administrator immediately.',
      ],
      ctaLabel: 'Sign in to HiTeam',
      ctaUrl: params.loginUrl,
    };
  }

  private renderHtml(
    template: {
      subject: string;
      preview: string;
      paragraphs: string[];
      ctaLabel: string;
      ctaUrl: string;
    },
    locale: EmailLocale,
  ) {
    const paragraphs = template.paragraphs
      .map(
        (paragraph) =>
          `<p style="margin:0 0 16px;color:#27313d;font-size:16px;line-height:1.55;">${this.escapeHtml(paragraph)}</p>`,
      )
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
      `<h1 style="margin:10px 0 18px;color:#111827;font-size:24px;line-height:1.25;">${this.escapeHtml(template.subject)}</h1>`,
      paragraphs,
      `<p style="margin:24px 0;"><a href="${this.escapeAttribute(template.ctaUrl)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;border-radius:6px;padding:12px 18px;font-size:15px;font-weight:700;">${this.escapeHtml(template.ctaLabel)}</a></p>`,
      `<p style="margin:22px 0 0;color:#6b7280;font-size:13px;line-height:1.5;">${this.escapeHtml(locale === 'ru' ? 'Это письмо отправлено автоматически.' : 'This email was sent automatically.')}</p>`,
      '</td></tr>',
      '</table>',
      '</td></tr>',
      '</table>',
      '</body></html>',
    ].join('');
  }

  private renderText(template: {
    subject: string;
    paragraphs: string[];
    ctaLabel: string;
    ctaUrl: string;
  }) {
    return [
      template.subject,
      '',
      ...template.paragraphs,
      '',
      `${template.ctaLabel}: ${template.ctaUrl}`,
    ].join('\n');
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

  private normalizeEmailLocale(locale?: string | null): EmailLocale {
    return locale?.trim().toLowerCase() === 'ru' ? 'ru' : 'en';
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
