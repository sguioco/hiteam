/* Optional activity: no form values, full URLs, queries, account IDs or cookies. */
(function () {
  'use strict';
  if (window.AltProductActivity) return;
  window.AltProductActivity = true;
  var product = (document.currentScript && document.currentScript.dataset.product) || '';
  if (!/^(fastsign|mapty|hiteam|send24)$/.test(product)) return;
  var key = 'alt-product-visitor-v1', visitor, lastRoute = null;
  function allowed() { return !!(window.AltCookieConsent && window.AltCookieConsent.allowed()); }
  function segment() {
    var path = location.pathname.replace(/\/$/, '') || '/';
    if (product !== 'send24' && (path === '/' || path === '/landing' || /^\/(en|ru|ar|es)$/.test(path))) return 'landing';
    if (/^\/(app|dashboard|integrations|activity|tasks|employees|calendar|news|rating|leaderboard|analytics|settings|forms|templates|campaigns|contacts|chats|inbox|automations|billing|audits|locations|workspace|attendance|organization|collaboration|schedule|requests|biometric|profile|support|payroll|employee|notifications|observability|diagnostics)(\/|$)/.test(path)) return 'cabinet';
    return 'other';
  }
  function identity() {
    if (visitor) return visitor;
    if (!window.crypto || !crypto.randomUUID) return null;
    try {
      var stored = JSON.parse(localStorage.getItem(key) || 'null');
      if (stored && stored.expires > Date.now() && /^[a-f0-9-]{36}$/.test(stored.id)) visitor = stored.id;
      else {
        visitor = crypto.randomUUID();
        localStorage.setItem(key, JSON.stringify({id:visitor, expires:Date.now() + 8*86400000}));
      }
    } catch (_) { return null; } // Without storage, don't invent stable visitor counts.
    return visitor;
  }
  function send(kind) {
    if (!allowed() || document.visibilityState === 'hidden' || navigator.webdriver || !identity()) return;
    var payload = JSON.stringify({id:crypto.randomUUID(), visitor:visitor, product:product, segment:segment(), kind:kind, consent:true});
    // text/plain is a CORS-safelisted content type; no cookies or credentials.
    fetch('https://alt-tech.net/api/activity/events', {method:'POST', mode:'no-cors', credentials:'omit', keepalive:true, headers:{'Content-Type':'text/plain'}, body:payload}).catch(function () {});
  }
  function view() {
    if (!allowed()) return;
    var route = location.pathname; // Compare locally, never send a path or query.
    if (route !== lastRoute && document.visibilityState !== 'hidden') { send('view'); lastRoute = route; }
  }
  window.addEventListener('alt-cookie-consent', function () {
    if (allowed()) view();
    else { visitor = null; lastRoute = null; try { localStorage.removeItem(key); } catch (_) {} }
  });
  document.addEventListener('visibilitychange', view);
  window.addEventListener('popstate', view);
  ['pushState', 'replaceState'].forEach(function (method) {
    var original = history[method];
    history[method] = function () { var result = original.apply(this, arguments); view(); return result; };
  });
  document.addEventListener('click', function (event) {
    if (!event.isTrusted || !allowed()) return;
    var target = event.target instanceof Element && event.target.closest('button,a[href],[role="button"]');
    if (!target || target.closest('#alt-cookie-consent') || target.hasAttribute('disabled') || target.getAttribute('aria-disabled') === 'true') return;
    send('click');
  });
  view();
})();
