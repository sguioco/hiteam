/* Alt Technologies consent UI v1. No optional scripts or identifiers before opt-in. */
(function () {
  'use strict';
  if (window.AltCookieConsent) return;
  var config = document.currentScript ? document.currentScript.dataset : {};
  var brand = config.brand || 'alt';
  var activityScriptUrl = new URL('product-activity.js?v=20261109', document.currentScript.src).href;
  var policy = config.privacy || (brand === 'fastsign' ? 'https://api.fastsign.ae/privacy' : '/privacy');
  var key = 'alt-cookie-choice-v1';
  var lifetime = 180 * 86400000;
  var choice = null;
  var storageAvailable = true;
  try {
    var saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved && saved.version === 1 && ['accepted', 'rejected'].indexOf(saved.choice) >= 0 && saved.expires > Date.now()) choice = saved.choice;
  } catch (_) { storageAvailable = false; }

  var copy = {
    en: ['Your privacy choices', 'Necessary cookies and browser storage keep sign-in, security and requested features working. Optional analytics, referral storage and third-party extras stay off unless you accept.', 'Accept all', 'Necessary only', 'Privacy policy', 'Cookie settings', 'This browser cannot save your choice; it applies to this page only.'],
    ru: ['Настройки конфиденциальности', 'Необходимые cookies и хранилище браузера обеспечивают вход, безопасность и запрошенные функции. Необязательная аналитика, сохранение источника перехода и внешние дополнения включаются только с вашего согласия.', 'Принять все', 'Только необходимые', 'Политика конфиденциальности', 'Настройки cookies', 'Браузер не позволяет сохранить выбор; он действует только на этой странице.'],
    es: ['Preferencias de privacidad', 'Las cookies y el almacenamiento necesarios permiten el acceso, la seguridad y las funciones solicitadas. La analítica, la atribución y los servicios externos opcionales permanecen desactivados hasta que los aceptes.', 'Aceptar todas', 'Solo necesarias', 'Política de privacidad', 'Configurar cookies', 'Este navegador no puede guardar tu elección; solo se aplica a esta página.'],
    ar: ['خيارات الخصوصية', 'تتيح ملفات الارتباط والتخزين الضروري تسجيل الدخول والأمان والميزات المطلوبة. تبقى التحليلات وتخزين مصدر الزيارة والخدمات الخارجية الاختيارية معطلة حتى توافق عليها.', 'قبول الكل', 'الضرورية فقط', 'سياسة الخصوصية', 'إعدادات ملفات الارتباط', 'لا يستطيع المتصفح حفظ اختيارك؛ يسري على هذه الصفحة فقط.'],
    hi: ['गोपनीयता विकल्प', 'ज़रूरी कुकी और ब्राउज़र स्टोरेज लॉगिन, सुरक्षा और अनुरोधित सुविधाएँ चलाते हैं। वैकल्पिक विश्लेषण, रेफ़रल स्टोरेज और बाहरी सेवाएँ आपकी अनुमति मिलने तक बंद रहती हैं।', 'सभी स्वीकारें', 'केवल ज़रूरी', 'गोपनीयता नीति', 'कुकी सेटिंग', 'यह ब्राउज़र चुनाव सहेज नहीं सकता; यह केवल इस पेज पर लागू होगा।'],
    ur: ['رازداری کے اختیارات', 'ضروری کوکیز اور براؤزر اسٹوریج لاگ ان، سیکیورٹی اور مطلوبہ خصوصیات چلاتے ہیں۔ اختیاری تجزیات، حوالہ اسٹوریج اور بیرونی خدمات آپ کی اجازت تک بند رہتی ہیں۔', 'سب قبول کریں', 'صرف ضروری', 'رازداری کی پالیسی', 'کوکی کی ترتیبات', 'یہ براؤزر انتخاب محفوظ نہیں کر سکتا؛ یہ صرف اس صفحے پر لاگو ہوگا۔']
  };
  var themes = {
    alt: '--cc-bg:#fff;--cc-fg:#101633;--cc-accent:#3f3df4;--cc-on:#fff;',
    spy: '--cc-bg:#25272b;--cc-fg:#f1f1f1;--cc-accent:#ee5b98;--cc-on:#171719;',
    salon: '--cc-bg:#fff;--cc-fg:#3b2333;--cc-accent:#b8325a;--cc-on:#fff;',
    clinic: '--cc-bg:#fff;--cc-fg:#37383e;--cc-accent:#d80034;--cc-on:#fff;',
    fastsign: '--cc-bg:hsl(var(--card,0 0% 100%));--cc-fg:hsl(var(--foreground,222 47% 11%));--cc-accent:hsl(var(--primary-600,35 70% 45%));--cc-on:#fff;',
    mapty: '--cc-bg:var(--lp-surface,#fff);--cc-fg:var(--lp-text-primary,#253556);--cc-accent:var(--lp-accent,#5474eb);--cc-on:#fff;',
    hiteam: '--cc-bg:var(--card,#fff);--cc-fg:var(--foreground,#171717);--cc-accent:#2563eb;--cc-on:#fff;',
    altegio: '--cc-bg:var(--bg-elev,#fff);--cc-fg:var(--ink,#0d0d0d);--cc-accent:var(--accent,#108567);--cc-on:#fff;',
    send24: '--cc-bg:var(--surface,#15191f);--cc-fg:var(--text,#edf0f4);--cc-accent:var(--accent,#3d9a7a);--cc-on:#fff;'
  };
  function allowed() { return choice === 'accepted'; }
  function clearOptional() {
    try { localStorage.removeItem('alt-product-visitor-v1'); } catch (_) {}
    try { localStorage.removeItem('alt-training-manager-v1'); localStorage.removeItem('mapty-outreach-source-v1'); }
    catch (_) { /* Storage can be disabled without blocking necessary features. */ }
    document.cookie.split(';').forEach(function (entry) {
      var name = entry.split('=')[0].trim();
      if (!/^(_ga($|_)|_gid$|_gat|_clck$|_clsk$)/.test(name)) return;
      var parts = location.hostname.split('.');
      var domains = ['', location.hostname, '.' + location.hostname, '.' + parts.slice(-2).join('.')];
      domains.forEach(function (domain) { document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax' + (domain ? '; Domain=' + domain : ''); });
    });
  }
  var panel, settings, shadow, warning;
  function publish() {
    if (allowed() && /^(fastsign|mapty|hiteam|send24)$/.test(brand) && !document.getElementById('alt-product-activity-script')) {
      var tracker = document.createElement('script');
      tracker.id = 'alt-product-activity-script';
      tracker.src = activityScriptUrl;
      tracker.dataset.product = brand;
      document.head.appendChild(tracker);
    }
    window.dispatchEvent(new CustomEvent('alt-cookie-consent', {detail: {optional: allowed()}}));
  }
  function save(next) {
    var revoke = allowed() && next === 'rejected';
    choice = next;
    try { localStorage.setItem(key, JSON.stringify({version:1, choice:choice, expires:Date.now()+lifetime})); storageAvailable = true; }
    catch (_) { storageAvailable = false; }
    if (!allowed()) clearOptional();
    publish();
    if (storageAvailable) panel.hidden = true;
    else { warning.hidden = false; warning.textContent = words()[6]; }
    settings.hidden = false;
    if (revoke) location.reload(); // Remove already-running optional scripts after withdrawing consent.
  }
  function words() { return copy[(document.documentElement.lang || 'en').split('-')[0]] || copy.en; }
  var activityNotice = {
    en: 'Product analytics counts page views and clicks using a random browser ID retained for up to 8 days. Alt Technologies processes these events in Germany.',
    ru: 'Аналитика продукта считает просмотры и клики по случайному идентификатору браузера со сроком хранения до 8 дней. Alt Technologies обрабатывает эти события в Германии.',
    es: 'La analítica del producto cuenta vistas y clics con un identificador aleatorio del navegador conservado hasta 8 días. Alt Technologies procesa estos eventos en Alemania.',
    ar: 'تحسب تحليلات المنتج المشاهدات والنقرات باستخدام معرّف متصفح عشوائي يُحتفظ به لمدة تصل إلى 8 أيام. تعالج Alt Technologies هذه الأحداث في ألمانيا.',
    hi: 'उत्पाद विश्लेषण एक यादृच्छिक ब्राउज़र आईडी से पेज व्यू और क्लिक गिनता है, जिसे अधिकतम 8 दिन रखा जाता है। Alt Technologies इन इवेंट को जर्मनी में संसाधित करता है।',
    ur: 'پروڈکٹ تجزیات ایک بے ترتیب براؤزر شناخت سے صفحے کے مشاہدات اور کلکس گنتے ہیں، جسے زیادہ سے زیادہ 8 دن رکھا جاتا ہے۔ Alt Technologies ان واقعات پر جرمنی میں کارروائی کرتا ہے۔'
  };
  function translate() {
    var w = words();
    shadow.querySelector('#cc-title').textContent = w[0];
    var language = (document.documentElement.lang || 'en').split('-')[0];
    shadow.querySelector('#cc-description').textContent = w[1] + ' ' + (activityNotice[language] || activityNotice.en);
    shadow.querySelector('#cc-accept').textContent = w[2];
    shadow.querySelector('#cc-reject').textContent = w[3];
    shadow.querySelector('#cc-policy').textContent = w[4];
    settings.textContent = w[5];
    warning.textContent = w[6];
    panel.dir = /^(ar|ur)/.test(document.documentElement.lang) ? 'rtl' : 'ltr';
  }
  window.AltCookieConsent = {allowed:allowed, open:function () { if (panel) { panel.hidden=false; settings.hidden=true; shadow.querySelector('#cc-reject').focus(); } }};
  function mount() {
    var host = document.createElement('div');
    host.id = 'alt-cookie-consent';
    host.setAttribute('data-brand', brand);
    // Only the initial dialog floats. The persistent control lives in the
    // document footer flow, so it cannot cover forms, chat or legal links.
    host.style.cssText = 'display:block;width:100%;clear:both;font-family:inherit;';
    shadow = host.attachShadow({mode:'open'});
    shadow.innerHTML = '<style>:host{'+(themes[brand]||themes.alt)+'}*{box-sizing:border-box}[hidden]{display:none!important}section{width:440px;max-width:calc(100vw - 36px);max-height:calc(100dvh - 36px);overflow:auto;background:var(--cc-bg);color:var(--cc-fg);border:1px solid color-mix(in srgb,var(--cc-fg) 18%,transparent);border-radius:16px;padding:22px;box-shadow:0 12px 50px #0003;font-family:inherit;font-size:14px;line-height:1.55}h2{font-family:inherit;font-size:18px;font-weight:700;line-height:1.3;margin:0 0 12px}p{margin:0 0 14px}a{color:var(--cc-fg);text-underline-offset:3px}nav{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:18px 0 12px}button{font-family:inherit;font-size:13px;font-weight:600;line-height:1.4;cursor:pointer;border-radius:9px;min-height:44px;padding:10px;border:1px solid var(--cc-accent);background:var(--cc-bg);color:var(--cc-fg)}#cc-accept{background:var(--cc-accent);color:var(--cc-on)}button:focus-visible,a:focus-visible{outline:3px solid var(--cc-accent);outline-offset:3px}#cc-settings{background:var(--cc-bg);color:var(--cc-fg);box-shadow:0 2px 12px #0002;font-size:12px;min-height:36px}#cc-warning{font-size:12px;margin-top:12px}@media(max-width:480px){section{padding:18px}nav{grid-template-columns:1fr}}@media print{:host{display:none}}</style><section role="dialog" aria-labelledby="cc-title" aria-describedby="cc-description"><h2 id="cc-title"></h2><p id="cc-description"></p><nav><button id="cc-accept" type="button"></button><button id="cc-reject" type="button"></button></nav><a id="cc-policy" ></a><p id="cc-warning" role="status" hidden></p></section><button id="cc-settings" type="button" hidden></button>';
    panel = shadow.querySelector('section');
    panel.style.cssText = 'position:fixed;bottom:18px;left:18px;z-index:2147483000;';
    settings = shadow.querySelector('#cc-settings');
    settings.style.cssText = 'display:block;margin:12px auto;padding:4px 8px;min-height:36px;border:0;background:transparent;box-shadow:none;color:var(--cc-fg);text-decoration:underline;text-underline-offset:3px;';
    warning = shadow.querySelector('#cc-warning');
    shadow.querySelector('#cc-policy').href = policy;
    shadow.querySelector('#cc-accept').onclick = function () { save('accepted'); };
    shadow.querySelector('#cc-reject').onclick = function () { save('rejected'); };
    settings.onclick = window.AltCookieConsent.open;
    panel.hidden = choice !== null;
    settings.hidden = choice === null;
    translate();
    document.body.appendChild(host);
    new MutationObserver(translate).observe(document.documentElement,{attributes:true,attributeFilter:['lang','dir']});
    if (!allowed()) clearOptional();
    publish();
  }
  window.addEventListener('storage', function (event) { if (event.key === key) location.reload(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
