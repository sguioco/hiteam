'use client';

import { useEffect, useState } from 'react';
import { AnnouncementItem } from '@smart/types';
import { EmployeeShell } from '../../../components/employee-shell';
import { getSession } from '../../../lib/auth';
import { apiRequest } from '../../../lib/api';
import { useI18n } from '../../../lib/i18n';

export default function EmployeeAnnouncementsPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<AnnouncementItem[]>([]);

  useEffect(() => {
    const session = getSession();
    if (!session) return;

    void apiRequest<AnnouncementItem[]>('/collaboration/announcements/me', {
      token: session.accessToken,
    }).then(setItems);
  }, []);

  return (
    <EmployeeShell>
      <section className="section-stack">
        <section className="section-header">
          <span className="eyebrow">{t('employeePortal.announcements')}</span>
          <h1>{t('collaboration.announcementsTitle')}</h1>
          <p>{t('collaboration.subtitle')}</p>
        </section>

        {items.length ? (
          <div className="section-stack">
            {items.map((item) => (
              <article className="panel" key={item.id}>
                <div className="panel-header">
                  <div>
                    <span className="section-kicker">{item.audience}</span>
                    <h2>{item.title}</h2>
                  </div>
                  {item.isPinned ? <span className="status-chip">PINNED</span> : null}
                </div>
                <p>{item.body}</p>
                <div className="detail-row">
                  <span>{t('collaboration.created')}</span>
                  <strong>{item.authorEmployee.firstName} {item.authorEmployee.lastName}</strong>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">{t('collaboration.noAnnouncements')}</div>
        )}
      </section>
    </EmployeeShell>
  );
}
