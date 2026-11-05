'use client';

import { useEffect, useState } from 'react';

export function OptionalPublicChat({ script }: { script: string }) {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const update = () => setAllowed((window as Window & { AltCookieConsent?: { allowed(): boolean } }).AltCookieConsent?.allowed() === true);
    update();
    window.addEventListener('alt-cookie-consent', update);
    return () => window.removeEventListener('alt-cookie-consent', update);
  }, []);
  useEffect(() => {
    if (!allowed || document.getElementById('umnico-consented-bootstrap')) return;
    const element = document.createElement('script');
    element.id = 'umnico-consented-bootstrap';
    element.textContent = script;
    document.body.appendChild(element);
  }, [allowed, script]);
  if (!allowed) return null;
  return <>
    <a className="umnico-widget-logo" data-umnico-logo="true" draggable={false} href="https://umnico.com/?utm_source=widget&utm_medium=online_chat&utm_campaign=button" rel="noopener noreferrer" target="_blank">
      <img alt="Umnico logo" className="umnico-widget-logo-image" draggable={false} src="https://umnico.com/assets/index/umnico1.svg" />
    </a>
    <div className="umnico-widget-loader" data-umnico-loader="true">Loading</div>
  </>;
}
