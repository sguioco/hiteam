div
style
/* =========================================================================
   Brand Voice — scoped tokens (Altegio Design System foundations)
   Sourced from marketing/brand-voice. All selectors scoped to .bv-page.
   ========================================================================= */
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap");

/* Hide the global Redocly top navbar on this page only. */
body:has(.bv-page) header,
body:has(.bv-page) nav[data-component-name="Navbar/Navbar"] {
  display: none !important;
}

.bv-page {
  --bv-yellow:        #FFCB00;
  --bv-yellow-hover:  #FDBE1C;
  --bv-yellow-active: #FDAE1C;
  --bv-yellow-soft:   #FFECA1;
  --bv-ink:           #22222E;

  --bv-fg-primary:    #22222E;
  --bv-fg-secondary:  #626C77;
  --bv-fg-tertiary:   #A3A3B1;
  --bv-fg-on-dark:    #FFFFFF;
  --bv-fg-on-dark-2:  #F9FBFD;
  --bv-fg-on-dark-3:  #919299;

  --bv-color-success: #0DC268;
  --bv-color-error:   #ED0A34;

  --bv-surface:           #FFFFFF;
  --bv-surface-muted:     #F2F3F7;
  --bv-surface-secondary: #F0F1F8;
  --bv-surface-card:      #F9FBFD;
  --bv-surface-dark:      #22222E;
  --bv-surface-dark-2:    #14141C;
  --bv-surface-dark-3:    #343442;

  --bv-rule:        rgba(34,34,46,.10);
  --bv-rule-strong: rgba(34,34,46,.18);
  --bv-rule-dark:   rgba(255,255,255,.12);
  --bv-rule-dark-2: rgba(255,255,255,.20);

  --bv-radius-xs:  4px;
  --bv-radius-sm:  8px;
  --bv-radius-md:  12px;
  --bv-radius-lg:  20px;
  --bv-radius-xl:  32px;
  --bv-radius-pill: 999px;

  --bv-shadow-sm:  0 1px 2px rgba(34,34,46,.06), 0 1px 1px rgba(34,34,46,.04);
  --bv-shadow-md:  0 8px 24px rgba(34,34,46,.08), 0 2px 4px rgba(34,34,46,.04);
  --bv-shadow-lg:  0 16px 40px rgba(34,34,46,.18), 0 6px 12px rgba(34,34,46,.10);
  --bv-shadow-card-dark: 0 8px 24px 0 rgba(0,0,0,.08);

  --bv-font-sans: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --bv-font-mono: "JetBrains Mono", ui-monospace, "IBM Plex Mono", Menlo, Consolas, monospace;

  --bv-pad-x: max(40px, calc((100% - 1280px) / 2));
  --bv-pad-y: clamp(72px, 9vw, 132px);

  font-family: var(--bv-font-sans);
  background: var(--bv-surface);
  color: var(--bv-ink);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
@media (max-width: 1023px) { .bv-page { --bv-pad-x: 32px; } }
@media (max-width: 759px)  { .bv-page { --bv-pad-x: 20px; } }

.bv-page *, .bv-page *::before, .bv-page *::after { box-sizing: border-box; }
.bv-page ::selection { background: var(--bv-yellow); color: var(--bv-ink); }

/* The two glyphs — the entire visual system in one rule */
.bv-page .gl {
  font-family: var(--bv-font-mono);
  font-weight: 700;
  color: var(--bv-yellow);
  display: inline-block;
  font-size: 0.96em;
  line-height: 1;
  letter-spacing: 0;
}
.bv-page .gl-bs { margin-right: 0.14em; }
.bv-page .gl-us { margin-left: 0.08em; transform: translateY(-0.05em); }
@keyframes bv-blink { 0%, 55% { opacity: 1; } 56%, 100% { opacity: 0.18; } }
.bv-page .gl-live { animation: bv-blink 1.2s steps(2, end) infinite; }

/* Top strip */
.bv-page .bv-strip {
  display: flex; align-items: center; justify-content: space-between;
  padding: 24px var(--bv-pad-x);
  background: var(--bv-surface);
}
.bv-page .bv-strip .bv-mark,
.bv-page .bv-strip .bv-mark:link,
.bv-page .bv-strip .bv-mark:visited,
.bv-page .bv-strip .bv-mark:hover,
.bv-page .bv-strip .bv-mark:focus,
.bv-page .bv-strip .bv-mark:active {
  font-family: var(--bv-font-mono); font-weight: 700; font-size: 18px;
  color: var(--bv-ink) !important; text-decoration: none !important; letter-spacing: -0.01em;
}
.bv-page .bv-strip .bv-mark .gl { font-size: 1em; }
.bv-page .bv-strip .bv-meta {
  display: flex; gap: 18px; align-items: baseline;
  font-family: var(--bv-font-mono); font-weight: 600; font-size: 12px;
  color: var(--bv-fg-tertiary);
}
.bv-page .bv-strip .bv-meta b { color: var(--bv-ink); font-weight: 700; }

/* Section scaffold */
.bv-page .bv-section { padding: var(--bv-pad-y) var(--bv-pad-x); position: relative; }
/* Tighten gap between top strip and the first (Opening) section. */
.bv-page .bv-strip + .bv-section { padding-top: clamp(32px, 4vw, 56px); }
.bv-page .bv-section.muted { background: var(--bv-surface-muted); }
.bv-page .bv-section.dark  { background: var(--bv-ink); color: var(--bv-fg-on-dark); }

.bv-page .bv-sec-title {
  display: flex; align-items: baseline; gap: 0;
  margin-bottom: clamp(40px, 5vw, 56px);
}
.bv-page .bv-sec-title .tag {
  font-family: var(--bv-font-mono); font-weight: 700; font-size: 12px;
  color: var(--bv-ink); margin-right: 0.4ch;
}
.bv-page .bv-sec-title .tag .gl { font-size: 1em; }
.bv-page .bv-sec-title .name {
  font-family: var(--bv-font-sans); font-weight: 600; font-size: 12px;
  color: var(--bv-ink); text-transform: lowercase; letter-spacing: 0;
}
.bv-page .bv-sec-title .hr {
  flex: 1; height: 1px; align-self: center;
  background: var(--bv-rule); margin: 0 20px;
}
.bv-page .bv-sec-title .pg {
  font-family: var(--bv-font-mono); font-weight: 600; font-size: 12px;
  color: var(--bv-fg-tertiary); white-space: nowrap;
}
.bv-page .bv-section.dark .bv-sec-title .tag,
.bv-page .bv-section.dark .bv-sec-title .name { color: var(--bv-fg-on-dark); }
.bv-page .bv-section.dark .bv-sec-title .hr   { background: var(--bv-rule-dark-2); }
.bv-page .bv-section.dark .bv-sec-title .pg   { color: var(--bv-fg-on-dark-3); }

/* Hero */
.bv-page .bv-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: clamp(40px, 5vw, 80px);
  align-items: center;
}
.bv-page .bv-hero-left { display: flex; flex-direction: column; gap: clamp(28px, 3vw, 40px); }
.bv-page .bv-hero h1 {
  font-family: "Inter", sans-serif;
  font-weight: 600;
  font-size: clamp(44px, 6.2vw, 96px);
  line-height: 0.98;
  letter-spacing: -0.04em;
  margin: 0; max-width: 14ch;
  color: var(--bv-ink); text-wrap: balance;
}
.bv-page .bv-hero h1 .gl {
  font-size: 0.82em; transform: translateY(-0.13em);
  margin-left: 0.02em; vertical-align: baseline;
  animation: bv-blink 1.2s steps(2, end) infinite;
}
.bv-page .bv-hero-media { display: flex; align-items: center; justify-content: flex-end; }
.bv-page .bv-hero-media img {
  width: 100%; height: auto; max-width: 640px;
  display: block; border-radius: var(--bv-radius-xl);
}
.bv-page .bv-lede {
  font-size: clamp(17px, 1.25vw, 20px); line-height: 1.55;
  color: var(--bv-fg-secondary); font-weight: 400;
  margin: 0; max-width: 48ch;
}
.bv-page .bv-lede b { color: var(--bv-ink); font-weight: 600; }
.bv-page .bv-cta-row { display: flex; gap: 12px; flex-wrap: wrap; }
.bv-page a.bv-cta {
  display: inline-flex; align-items: center; justify-content: center; gap: 10px;
  padding: 16px 22px; border-radius: var(--bv-radius-md);
  font-family: "Inter", sans-serif; font-weight: 700; font-size: 16px;
  text-decoration: none; border: 0; cursor: pointer; line-height: 1;
  transition: background-color .12s ease, transform .08s ease, border-color .12s ease;
}
.bv-page a.bv-cta:active { transform: translateY(.5px); }
.bv-page a.bv-cta.primary  { background: var(--bv-yellow); color: var(--bv-ink); }
.bv-page a.bv-cta.primary:hover  { background: var(--bv-yellow-hover); color: var(--bv-ink); }
.bv-page a.bv-cta.primary:active { background: var(--bv-yellow-active); color: var(--bv-ink); }
.bv-page a.bv-cta.ghost    { background: transparent; color: var(--bv-ink); border: 1.5px solid var(--bv-rule-strong); }
.bv-page a.bv-cta.ghost:hover { border-color: var(--bv-ink); color: var(--bv-ink); }
.bv-page .bv-section.dark a.bv-cta.ghost { color: var(--bv-fg-on-dark); border-color: var(--bv-rule-dark-2); }
.bv-page .bv-section.dark a.bv-cta.ghost:hover { border-color: var(--bv-fg-on-dark); color: var(--bv-fg-on-dark); }

/* Harden every .bv-cta against the global Redocly link theme
   (visited turning blue, underline on hover, etc.). */
.bv-page a.bv-cta.primary,
.bv-page a.bv-cta.primary:link,
.bv-page a.bv-cta.primary:visited,
.bv-page a.bv-cta.primary:hover,
.bv-page a.bv-cta.primary:focus,
.bv-page a.bv-cta.primary:active {
  color: var(--bv-ink) !important;
  text-decoration: none !important;
}
.bv-page a.bv-cta.ghost,
.bv-page a.bv-cta.ghost:link,
.bv-page a.bv-cta.ghost:visited,
.bv-page a.bv-cta.ghost:hover,
.bv-page a.bv-cta.ghost:focus,
.bv-page a.bv-cta.ghost:active {
  color: var(--bv-ink) !important;
  text-decoration: none !important;
}
.bv-page .bv-section.dark a.bv-cta.ghost,
.bv-page .bv-section.dark a.bv-cta.ghost:link,
.bv-page .bv-section.dark a.bv-cta.ghost:visited,
.bv-page .bv-section.dark a.bv-cta.ghost:hover,
.bv-page .bv-section.dark a.bv-cta.ghost:focus,
.bv-page .bv-section.dark a.bv-cta.ghost:active {
  color: var(--bv-fg-on-dark) !important;
}

@media (max-width: 900px) {
  .bv-page .bv-hero { grid-template-columns: 1fr; align-items: start; }
  .bv-page .bv-hero-media { order: -1; justify-content: center; }
}

/* For-whom — three numbered cards */
.bv-page .bv-audience {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.bv-page .bv-aud-card {
  background: var(--bv-surface);
  border-radius: var(--bv-radius-xl);
  padding: 36px 32px 32px;
  display: flex; flex-direction: column; gap: 18px;
  min-height: 220px;
  border: 1px solid var(--bv-rule);
}
.bv-page .bv-section.muted .bv-aud-card { background: var(--bv-surface); }
.bv-page .bv-aud-num {
  font-family: var(--bv-font-mono); font-weight: 700; font-size: 12px;
  color: var(--bv-fg-secondary);
}
.bv-page .bv-aud-num .gl { font-size: 1em; }
.bv-page .bv-aud-title {
  font-family: "Inter", sans-serif; font-weight: 600;
  font-size: 22px; letter-spacing: -0.012em; line-height: 1.2;
  color: var(--bv-ink); margin: 0;
}
.bv-page .bv-aud-body {
  font-size: 14px; line-height: 1.6; color: var(--bv-fg-secondary); margin: 0;
}
@media (max-width: 900px) { .bv-page .bv-audience { grid-template-columns: 1fr; } }

/* Program — 4 pillars (Product, Sales, Implementation, Marketing) */
.bv-page .bv-program {
  display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0;
  margin-top: clamp(56px, 6vw, 88px);
  border-top: 1px solid var(--bv-rule);
}
.bv-page .bv-pillar {
  padding: 32px 28px 36px;
  border-right: 1px solid var(--bv-rule);
  display: flex; flex-direction: column; gap: 14px;
}
.bv-page .bv-pillar:last-child { border-right: 0; }
.bv-page .bv-pillar .n {
  font-family: var(--bv-font-mono); font-weight: 700; font-size: 11px;
  color: var(--bv-fg-tertiary); letter-spacing: 0;
}
.bv-page .bv-pillar h3 {
  font-family: "Inter", sans-serif; font-weight: 600;
  font-size: 24px; letter-spacing: -0.018em; line-height: 1.15;
  color: var(--bv-ink); margin: 0;
}
.bv-page .bv-pillar h3 .gl { font-size: 0.92em; }
.bv-page .bv-pillar p {
  font-size: 14px; line-height: 1.6; color: var(--bv-fg-secondary); margin: 0;
}
@media (max-width: 1023px) { .bv-page .bv-program { grid-template-columns: repeat(2, 1fr); }
  .bv-page .bv-pillar:nth-child(2) { border-right: 0; }
  .bv-page .bv-pillar:nth-child(1), .bv-page .bv-pillar:nth-child(2) { border-bottom: 1px solid var(--bv-rule); }
}
@media (max-width: 600px) { .bv-page .bv-program { grid-template-columns: 1fr; }
  .bv-page .bv-pillar { border-right: 0; border-bottom: 1px solid var(--bv-rule); }
  .bv-page .bv-pillar:last-child { border-bottom: 0; }
}

/* Value — pairing layout: white card + connector + dark card */
.bv-page .bv-pair {
  display: grid; grid-template-columns: 1fr auto 1fr;
  gap: clamp(16px, 2vw, 28px); align-items: stretch;
}
.bv-page .bv-pair-card {
  background: var(--bv-surface);
  border-radius: var(--bv-radius-xl);
  padding: 40px 36px 32px;
  display: flex; flex-direction: column; gap: 18px;
  min-height: 320px;
}
.bv-page .bv-pair-card.dark { background: var(--bv-ink); color: var(--bv-fg-on-dark); }
.bv-page .bv-pair-card .pcap {
  display: flex; justify-content: space-between; align-items: baseline;
  padding-bottom: 12px; border-bottom: 1px solid var(--bv-rule);
}
.bv-page .bv-pair-card.dark .pcap { border-bottom-color: var(--bv-rule-dark); }
.bv-page .bv-pair-card .pcap b {
  font-family: var(--bv-font-sans); font-weight: 700; font-size: 13px;
  text-transform: lowercase; color: var(--bv-ink); letter-spacing: 0;
}
.bv-page .bv-pair-card.dark .pcap b { color: var(--bv-fg-on-dark); }
.bv-page .bv-pair-card .pcap > span {
  font-family: var(--bv-font-mono); font-weight: 500; font-size: 12px;
  color: var(--bv-fg-secondary);
}
.bv-page .bv-pair-card.dark .pcap > span { color: var(--bv-fg-on-dark-3); }
.bv-page .bv-pair-body { flex: 1; display: flex; flex-direction: column; gap: 16px; }
.bv-page .bv-pair-h {
  font-family: "Inter", sans-serif; font-weight: 600;
  font-size: clamp(28px, 2.4vw, 36px); letter-spacing: -0.024em; line-height: 1.05;
  color: var(--bv-ink); max-width: 14ch; margin: 0;
}
.bv-page .bv-pair-h .gl { font-size: 0.82em; transform: translateY(-0.08em); vertical-align: baseline; animation: bv-blink 1.2s steps(2, end) infinite; }
.bv-page .bv-pair-h-mono {
  font-family: var(--bv-font-mono); font-weight: 700;
  font-size: 22px; letter-spacing: -0.01em; line-height: 1.15;
  color: var(--bv-ink); margin: 0;
}
.bv-page .bv-pair-card.dark .bv-pair-h-mono { color: var(--bv-fg-on-dark); }
.bv-page .bv-pair-h-mono .gl { font-size: 1em; }
.bv-page .bv-pair-p {
  font-family: "Inter", sans-serif;
  font-size: 14px; line-height: 1.65; color: var(--bv-fg-secondary);
  margin: 0; max-width: 42ch;
}
.bv-page .bv-pair-card.dark .bv-pair-p { color: var(--bv-fg-on-dark-3); }
.bv-page .bv-pair-p b { color: var(--bv-ink); font-weight: 600; }
.bv-page .bv-pair-card.dark .bv-pair-p b { color: var(--bv-fg-on-dark); }
.bv-page .bv-pair-spec {
  margin-top: auto; padding-top: 18px;
  border-top: 1px solid var(--bv-rule);
  display: flex; justify-content: space-between; align-items: baseline;
  font-family: var(--bv-font-mono);
  font-size: 11px; letter-spacing: 0;
  font-weight: 700; color: var(--bv-ink);
}
.bv-page .bv-pair-card.dark .bv-pair-spec { border-top-color: var(--bv-rule-dark); color: var(--bv-fg-on-dark); }
.bv-page .bv-pair-spec .muted { color: var(--bv-fg-secondary); font-weight: 600; }
.bv-page .bv-pair-card.dark .bv-pair-spec .muted { color: var(--bv-fg-on-dark-3); }
.bv-page .bv-pair-conn {
  align-self: center;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  font-family: var(--bv-font-mono); font-weight: 700; color: var(--bv-yellow);
  font-size: 36px; line-height: 1; padding: 24px 4px;
}
.bv-page .bv-pair-conn .conn-label {
  font-family: "Inter", sans-serif; font-weight: 500; font-size: 14px;
  color: var(--bv-fg-tertiary);
}
.bv-page .bv-pair-foot {
  margin: clamp(28px, 3vw, 40px) 0 0;
  font-family: "Inter", sans-serif;
  font-size: 14px; line-height: 1.65; color: var(--bv-fg-secondary);
  max-width: 78ch;
  padding-top: 18px;
  border-top: 1px solid var(--bv-rule);
}
.bv-page .bv-pair-foot b { color: var(--bv-ink); font-weight: 600; }
@media (max-width: 900px) {
  .bv-page .bv-pair { grid-template-columns: 1fr; }
  .bv-page .bv-pair-conn { flex-direction: row; padding: 8px 0; }
}

/* Benefits — two-column layout with prototype on the right */
.bv-page .bv-benefits-layout {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: clamp(28px, 3vw, 48px);
  align-items: start;
}
.bv-page .bv-benefits-layout > .bv-benefits-phone-host { justify-self: center; }
.bv-page .bv-benefits-left {
  display: flex; flex-direction: column;
  gap: clamp(32px, 4vw, 48px);
}
.bv-page .bv-benefits {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;
  max-width: 720px;
}
.bv-page .bv-benefit {
  background: var(--bv-surface); border: 1px solid var(--bv-rule);
  border-radius: var(--bv-radius-xl);
  padding: 28px;
  display: flex; flex-direction: column; gap: 12px;
}
.bv-page .bv-benefit .n {
  font-family: var(--bv-font-mono); font-weight: 700; font-size: 11px;
  color: var(--bv-fg-tertiary);
}
.bv-page .bv-benefit h4 {
  font-family: "Inter", sans-serif; font-weight: 600;
  font-size: 20px; letter-spacing: -0.012em; line-height: 1.2;
  color: var(--bv-ink); margin: 0;
}
.bv-page .bv-benefit p {
  font-size: 14px; line-height: 1.6; color: var(--bv-fg-secondary); margin: 0;
}
.bv-page .bv-benefits-phone-host {
  width: 297px;  /* 412 × 0.72 */
  height: 624px; /* 866 × 0.72 */
  flex-shrink: 0;
  position: relative;
}
.bv-page .bv-phone-host {
  display: block;
  width: 412px; height: 866px;
  position: absolute; top: 0; left: 0;
  transform: scale(0.72);
  transform-origin: top left;
}
@media (max-width: 1180px) {
  .bv-page .bv-benefits-layout { grid-template-columns: 1fr; }
  .bv-page .bv-benefits-phone-host { justify-self: center; }
}
@media (max-width: 540px) {
  .bv-page .bv-benefits { grid-template-columns: 1fr; }
}

/* Metrics grid */
.bv-page .bv-metrics-lede {
  max-width: 56ch; margin: 0 0 clamp(40px, 5vw, 56px);
  font-size: 18px; line-height: 1.6; color: var(--bv-fg-on-dark-2);
}
.bv-page .bv-metrics {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 1px; background: var(--bv-rule-dark-2);
  border: 1px solid var(--bv-rule-dark-2);
}
.bv-page .bv-metric {
  background: var(--bv-ink); padding: 36px 28px;
  display: flex; flex-direction: column; gap: 10px;
}
.bv-page .bv-metric .v {
  font-family: "Inter", sans-serif; font-weight: 600;
  font-size: clamp(40px, 4.8vw, 64px); letter-spacing: -0.035em; line-height: 1;
  color: var(--bv-fg-on-dark);
}
.bv-page .bv-metric .v .gl { color: var(--bv-yellow); font-size: 0.55em; transform: translateY(-0.55em); }
.bv-page .bv-metric .l {
  font-family: var(--bv-font-sans); font-weight: 500; font-size: 14px; line-height: 1.5;
  color: var(--bv-fg-on-dark-3);
}
.bv-page .bv-metrics-foot {
  margin-top: 20px;
  font-family: var(--bv-font-mono); font-weight: 500; font-size: 12px;
  color: var(--bv-fg-on-dark-3);
}
@media (max-width: 900px) { .bv-page .bv-metrics { grid-template-columns: repeat(2, 1fr); } }

/* Mini metrics — TOC-style row inside benefits section */
.bv-page .bv-mini-metrics {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0;
  margin-top: clamp(48px, 5vw, 72px);
  padding-top: 24px;
  border-top: 1px solid var(--bv-rule);
}
.bv-page .bv-mini-metric {
  padding: 4px 20px;
  border-right: 1px solid var(--bv-rule);
  display: flex; flex-direction: column; gap: 8px;
}
.bv-page .bv-mini-metric:nth-child(6n) { border-right: 0; padding-right: 0; }
.bv-page .bv-mini-metric:nth-child(6n+1) { padding-left: 0; }
.bv-page .bv-mini-metric .n {
  font-family: var(--bv-font-mono); font-weight: 700;
  font-size: 11px; color: var(--bv-fg-secondary); letter-spacing: 0;
}
.bv-page .bv-mini-metric .v {
  font-family: "Inter", sans-serif; font-weight: 600;
  font-size: 28px; letter-spacing: -0.025em; line-height: 1.05;
  color: var(--bv-ink);
}
.bv-page .bv-mini-metric .v .gl { font-size: 1em; }
.bv-page .bv-mini-metric .lbl {
  font-family: "Inter", sans-serif; font-weight: 400;
  font-size: 12px; color: var(--bv-fg-secondary); line-height: 1.45;
}
.bv-page .bv-mini-metrics-foot {
  margin: 16px 0 0;
  font-family: var(--bv-font-mono); font-weight: 500;
  font-size: 11px; color: var(--bv-fg-tertiary);
}
.bv-page .bv-mini-metrics-foot .gl { font-size: 1em; }

/* Calculator controls — region tabs + clients slider, sits above mini-metrics */
.bv-page .bv-calc-controls {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: clamp(24px, 3vw, 48px);
  margin-top: clamp(48px, 5vw, 72px);
  padding: 24px 0 28px;
  border-top: 1px solid var(--bv-rule);
}
.bv-page .bv-calc-block { display: flex; flex-direction: column; gap: 14px; }
.bv-page .bv-calc-label {
  font-family: var(--bv-font-mono); font-weight: 700; font-size: 11px;
  color: var(--bv-fg-secondary); letter-spacing: 0;
  display: inline-flex; align-items: baseline;
  text-transform: lowercase;
}
.bv-page .bv-calc-label .gl { font-size: 1em; }
.bv-page .bv-calc-tabs { display: flex; flex-wrap: wrap; gap: 6px; }
.bv-page .bv-calc-tab {
  padding: 7px 12px;
  border-radius: var(--bv-radius-pill);
  background: var(--bv-surface-muted);
  border: 1px solid transparent;
  font-family: var(--bv-font-sans);
  font-size: 13px; font-weight: 500;
  color: var(--bv-fg-secondary);
  cursor: pointer;
  transition: background-color .12s ease, color .12s ease;
}
.bv-page .bv-calc-tab:hover { background: #E7E9EF; color: var(--bv-ink); }
.bv-page .bv-calc-tab.active { background: var(--bv-ink); color: var(--bv-fg-on-dark); }
.bv-page .bv-calc-slider { display: flex; align-items: center; gap: 14px; }
.bv-page .bv-calc-slider input[type=range] {
  flex: 1; height: 4px;
  -webkit-appearance: none; appearance: none;
  background: var(--bv-rule-strong);
  border-radius: 2px; outline: none;
}
.bv-page .bv-calc-slider input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 20px; height: 20px; border-radius: 50%;
  background: var(--bv-yellow); cursor: pointer;
  border: 2px solid #fff; box-shadow: var(--bv-shadow-sm);
}
.bv-page .bv-calc-slider input[type=range]::-moz-range-thumb {
  width: 20px; height: 20px; border-radius: 50%;
  background: var(--bv-yellow); cursor: pointer;
  border: 2px solid #fff; box-shadow: var(--bv-shadow-sm);
}
.bv-page .bv-calc-slider input[type=number] {
  width: 96px; padding: 8px 12px;
  border: 1px solid var(--bv-rule-strong);
  border-radius: var(--bv-radius-sm);
  font-family: var(--bv-font-mono);
  font-size: 15px; font-weight: 700;
  text-align: right;
  color: var(--bv-ink);
  background: var(--bv-surface);
}
.bv-page .bv-calc-slider input[type=number]:focus { outline: none; border-color: var(--bv-ink); }
.bv-page .bv-mini-metric .v { transition: opacity .12s ease; font-variant-numeric: tabular-nums; }
.bv-page .bv-mini-metrics.is-calc { border-top: 0; padding-top: 0; margin-top: 0; }
@media (max-width: 900px) {
  .bv-page .bv-calc-controls { grid-template-columns: 1fr; }
}
@media (max-width: 1023px) {
  .bv-page .bv-mini-metrics { grid-template-columns: repeat(3, 1fr); row-gap: 24px; }
  .bv-page .bv-mini-metric:nth-child(6n) { border-right: 1px solid var(--bv-rule); padding-right: 20px; }
  .bv-page .bv-mini-metric:nth-child(3n) { border-right: 0; padding-right: 0; }
  .bv-page .bv-mini-metric:nth-child(3n+1) { padding-left: 0; }
}
@media (max-width: 540px) {
  .bv-page .bv-mini-metrics { grid-template-columns: repeat(2, 1fr); }
  .bv-page .bv-mini-metric:nth-child(3n) { border-right: 1px solid var(--bv-rule); padding-right: 20px; }
  .bv-page .bv-mini-metric:nth-child(2n) { border-right: 0; padding-right: 0; }
  .bv-page .bv-mini-metric:nth-child(2n+1) { padding-left: 0; }
}
@media (max-width: 540px) { .bv-page .bv-metrics { grid-template-columns: 1fr; } }

/* Case study — Uzum */
.bv-page .bv-case-head {
  display: flex; flex-direction: column; gap: 12px;
  max-width: 70ch;
}
.bv-page .bv-case-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: clamp(32px, 4vw, 64px);
  align-items: start;
}
.bv-page .bv-case-left { display: flex; flex-direction: column; gap: clamp(32px, 4vw, 48px); }
.bv-page .bv-case-image img {
  width: 100%; height: auto;
  border-radius: var(--bv-radius-xl);
  display: block;
}

/* TOC-style steps — cross divider pattern (between 1|2 and 3|4, no outer border) */
.bv-page .bv-case-toc {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
}
.bv-page .bv-case-toc-item {
  display: flex; flex-direction: column;
  gap: 10px;
  padding: 22px 22px 22px 0;
  border-right: 1px solid var(--bv-rule);
}
.bv-page .bv-case-toc-item:nth-child(2n) {
  border-right: 0;
  padding-left: 22px; padding-right: 0;
}
.bv-page .bv-case-toc-item:nth-child(-n+2) {
  border-bottom: 1px solid var(--bv-rule);
  padding-bottom: 22px;
}
.bv-page .bv-case-toc-item:nth-child(n+3) {
  padding-top: 22px;
}

/* Other integrations — logo strip below the case study */
.bv-page .bv-case-integrations {
  margin-top: clamp(56px, 6vw, 88px);
  padding-top: clamp(32px, 4vw, 40px);
  border-top: 1px solid var(--bv-rule);
}
.bv-page .bv-case-int-eyebrow {
  display: inline-flex; align-items: baseline;
  font-family: var(--bv-font-mono); font-weight: 700; font-size: 12px;
  color: var(--bv-fg-secondary); letter-spacing: 0;
  margin-bottom: 12px;
}
.bv-page .bv-case-int-eyebrow .gl { font-size: 1em; }
.bv-page .bv-case-integrations h3 {
  font-family: "Inter", sans-serif; font-weight: 600;
  font-size: clamp(22px, 2vw, 30px); letter-spacing: -0.02em;
  color: var(--bv-ink); margin: 0 0 clamp(28px, 3vw, 36px);
  line-height: 1.2; max-width: 56ch;
}
.bv-page .bv-case-int-logos {
  display: flex; flex-wrap: wrap;
  gap: clamp(40px, 5vw, 72px);
  align-items: center;
}
.bv-page .bv-case-int-logo {
  display: inline-flex; align-items: center;
  height: 32px;
  filter: grayscale(0%);
  opacity: 0.9;
  transition: opacity .15s ease;
}
.bv-page .bv-case-int-logo:hover { opacity: 1; }
.bv-page .bv-case-int-logo svg { height: 100%; width: auto; display: block; }
.bv-page .bv-case-toc-item .n {
  font-family: var(--bv-font-mono); font-weight: 700; font-size: 11px;
  color: var(--bv-fg-secondary); letter-spacing: 0;
}
.bv-page .bv-case-toc-item .lbl {
  font-family: "Inter", sans-serif; font-weight: 600;
  font-size: 20px; letter-spacing: -0.012em; line-height: 1.1;
  color: var(--bv-ink);
  display: inline-flex; align-items: baseline;
}
.bv-page .bv-case-toc-item .lbl .gl { font-size: 1em; }
.bv-page .bv-case-toc-item .ds {
  font-family: "Inter", sans-serif; font-weight: 400; font-size: 13px;
  color: var(--bv-fg-secondary); line-height: 1.5;
}
@media (max-width: 900px) {
  .bv-page .bv-case-layout { grid-template-columns: 1fr; }
}
.bv-page .bv-case-head h2 {
  font-family: "Inter", sans-serif; font-weight: 600;
  font-size: clamp(32px, 4vw, 48px); letter-spacing: -0.025em; line-height: 1.1;
  color: var(--bv-ink); margin: 0;
}
.bv-page .bv-case-head h2 .gl { font-size: 0.82em; }
.bv-page .bv-case-head p {
  font-size: 17px; line-height: 1.55; color: var(--bv-fg-secondary); margin: 0;
}
.bv-page .bv-case-steps {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 0; border-top: 1px solid var(--bv-rule);
}
.bv-page .bv-case-step {
  padding: 28px 24px 32px; border-right: 1px solid var(--bv-rule);
  display: flex; flex-direction: column; gap: 12px;
}
.bv-page .bv-case-step:last-child { border-right: 0; }
.bv-page .bv-case-step .n {
  font-family: var(--bv-font-mono); font-weight: 700; font-size: 11px;
  color: var(--bv-yellow); letter-spacing: 0;
}
.bv-page .bv-case-step h4 {
  font-family: "Inter", sans-serif; font-weight: 600;
  font-size: 18px; letter-spacing: -0.01em; line-height: 1.25;
  color: var(--bv-ink); margin: 0;
}
.bv-page .bv-case-step p {
  font-size: 14px; line-height: 1.55; color: var(--bv-fg-secondary); margin: 0;
}
.bv-page .bv-case-step ul {
  margin: 0; padding: 0; list-style: none;
  display: flex; flex-direction: column; gap: 8px;
}
.bv-page .bv-case-step ul li {
  font-family: var(--bv-font-mono); font-weight: 600; font-size: 13px;
  color: var(--bv-ink); display: flex; gap: 8px; align-items: baseline;
}
.bv-page .bv-case-step ul li .gl { font-size: 1em; }
@media (max-width: 900px) { .bv-page .bv-case-steps { grid-template-columns: 1fr 1fr; }
  .bv-page .bv-case-step:nth-child(2) { border-right: 0; }
  .bv-page .bv-case-step:nth-child(1), .bv-page .bv-case-step:nth-child(2) { border-bottom: 1px solid var(--bv-rule); }
}
@media (max-width: 560px) { .bv-page .bv-case-steps { grid-template-columns: 1fr; }
  .bv-page .bv-case-step { border-right: 0; border-bottom: 1px solid var(--bv-rule); }
  .bv-page .bv-case-step:last-child { border-bottom: 0; }
}

/* Models — Co-Brand vs White Label */
.bv-page .bv-models { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.bv-page .bv-model {
  padding: 40px; border-radius: var(--bv-radius-xl);
  display: flex; flex-direction: column; gap: 18px;
  min-height: 480px;
}
.bv-page .bv-model.light {
  background: var(--bv-surface); border: 1px solid var(--bv-rule); color: var(--bv-ink);
}
.bv-page .bv-model.dark { background: var(--bv-ink); color: var(--bv-fg-on-dark); }
.bv-page .bv-model .head {
  display: flex; justify-content: space-between; align-items: baseline;
  padding-bottom: 18px; border-bottom: 1px solid var(--bv-rule);
}
.bv-page .bv-model.dark .head { border-bottom-color: var(--bv-rule-dark-2); }
.bv-page .bv-model .head .kind {
  font-family: "Inter", sans-serif; font-weight: 600; font-size: 28px; letter-spacing: -0.02em;
}
.bv-page .bv-model .head .kind .gl { font-size: 0.84em; }
.bv-page .bv-model .head .fee {
  font-family: var(--bv-font-mono); font-weight: 700; font-size: 12px;
  color: var(--bv-fg-secondary); text-align: right;
}
.bv-page .bv-model.dark .head .fee { color: var(--bv-fg-on-dark-3); }
.bv-page .bv-model .head .fee b { display: block; font-size: 16px; color: var(--bv-ink); margin-top: 4px; }
.bv-page .bv-model.dark .head .fee b { color: var(--bv-fg-on-dark); }
.bv-page .bv-model ul {
  list-style: none; margin: 0; padding: 0;
  display: flex; flex-direction: column; gap: 14px;
}
.bv-page .bv-model ul li {
  display: grid; grid-template-columns: 18px 1fr; gap: 12px;
  font-size: 15px; line-height: 1.55; color: var(--bv-fg-secondary);
}
.bv-page .bv-model.dark ul li { color: var(--bv-fg-on-dark-2); }
.bv-page .bv-model ul li b { color: var(--bv-ink); font-weight: 600; }
.bv-page .bv-model.dark ul li b { color: var(--bv-fg-on-dark); }
.bv-page .bv-model ul li .mk {
  font-family: var(--bv-font-mono); font-weight: 700; color: var(--bv-yellow); line-height: 1.55;
}
@media (max-width: 900px) { .bv-page .bv-models { grid-template-columns: 1fr; } }

/* Altegio in numbers — small stat grid on muted */
.bv-page .bv-numbers {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 0;
  border-top: 1px solid var(--bv-rule);
}
.bv-page .bv-num {
  padding: 28px 24px 32px;
  border-right: 1px solid var(--bv-rule);
  border-bottom: 1px solid var(--bv-rule);
  display: flex; flex-direction: column; gap: 6px;
}
.bv-page .bv-num:nth-child(3n) { border-right: 0; }
.bv-page .bv-num:nth-last-child(-n+3) { border-bottom: 0; }
.bv-page .bv-num .v {
  font-family: "Inter", sans-serif; font-weight: 600;
  font-size: clamp(32px, 3.4vw, 44px); letter-spacing: -0.03em; line-height: 1;
  color: var(--bv-ink);
}
.bv-page .bv-num .v .gl { color: var(--bv-yellow); font-size: 0.6em; transform: translateY(-0.5em); }
.bv-page .bv-num .l {
  font-family: var(--bv-font-sans); font-weight: 500; font-size: 14px;
  color: var(--bv-fg-secondary);
}
@media (max-width: 900px) {
  .bv-page .bv-numbers { grid-template-columns: repeat(2, 1fr); }
  .bv-page .bv-num:nth-child(3n) { border-right: 1px solid var(--bv-rule); }
  .bv-page .bv-num:nth-child(2n) { border-right: 0; }
  .bv-page .bv-num:nth-last-child(-n+3) { border-bottom: 1px solid var(--bv-rule); }
  .bv-page .bv-num:nth-last-child(-n+2) { border-bottom: 0; }
}
@media (max-width: 540px) {
  .bv-page .bv-numbers { grid-template-columns: 1fr; }
  .bv-page .bv-num { border-right: 0 !important; border-bottom: 1px solid var(--bv-rule); }
  .bv-page .bv-num:last-child { border-bottom: 0; }
}

/* Contact / closing */
.bv-page .bv-section#contact { padding-bottom: clamp(72px, 8vw, 120px) !important; }
.bv-page .bv-contact { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: clamp(40px, 5vw, 80px); align-items: start; }
.bv-page .bv-contact h2 {
  font-family: "Inter", sans-serif; font-weight: 600;
  font-size: clamp(40px, 6vw, 88px); letter-spacing: -0.035em; line-height: 0.98;
  color: var(--bv-fg-on-dark); margin: 0; max-width: 14ch;
}
.bv-page .bv-contact h2 .gl {
  font-size: 0.74em; transform: translateY(-0.13em);
  margin-left: 0.02em; vertical-align: baseline;
  animation: bv-blink 1.2s steps(2, end) infinite;
}
.bv-page .bv-contact-right { display: flex; flex-direction: column; gap: 28px; }
.bv-page .bv-contact-card {
  background: var(--bv-surface-dark-3); border-radius: var(--bv-radius-xl);
  padding: 32px;
  display: flex; flex-direction: column; gap: 6px;
}
.bv-page .bv-contact-card .who {
  font-family: var(--bv-font-mono); font-weight: 700; font-size: 12px;
  color: var(--bv-yellow); letter-spacing: 0;
}
.bv-page .bv-contact-card .name {
  font-family: "Inter", sans-serif; font-weight: 600; font-size: 24px; letter-spacing: -0.018em;
  color: var(--bv-fg-on-dark);
}
.bv-page .bv-contact-card .role {
  font-family: var(--bv-font-sans); font-weight: 400; font-size: 14px;
  color: var(--bv-fg-on-dark-3); margin-bottom: 8px;
}
.bv-page .bv-contact-card a:not(.bv-cta) {
  font-family: var(--bv-font-mono); font-weight: 700; font-size: 18px;
  color: var(--bv-fg-on-dark); text-decoration: none;
  transition: color .12s ease;
}
.bv-page .bv-contact-card a:not(.bv-cta):hover { color: var(--bv-yellow); }
.bv-page .bv-contact-card .bv-contact-cta { align-self: flex-start; margin-top: 18px; }
@media (max-width: 900px) { .bv-page .bv-contact { grid-template-columns: 1fr; } }

div
a
altegio
span
_
div
span
span
\
fintech-partnership
span
b
v1
· 2026.05
section
div
span
span
\
span
proposition
span
span
01 / 06
div
div
h1
Altegio for Fintech
span
_
p
Altegio launches a 
b
White Label solution
and grants exclusive platform access in markets of up to 10M people. For 
b
fintech companies and banks
rolling out products in the 
b
Beauty, Wellness, Sport, Health, Auto
service verticals and planning to scale 
b
BNPL
in local markets.
      
div
a
Become a partner
a
View models
div
img
div
div
span
01
h3
span
\
product
p
Joint solution with special terms and technical integration of fintech tools into the Altegio platform.
div
span
02
h3
span
\
sales
p
Dedicated sales managers and implementation specialists on the fintech partner's side.
div
span
03
h3
span
\
implementation
p
Altegio integrates the fintech solutions into the platform; the partner drives the joint product to market.
div
span
04
h3
span
\
marketing
p
Internal communications, performance marketing, offline marketing and PR in local markets.
section
div
span
span
\
span
value
span
span
02 / 06
div
div
div
b
span
SMB
growth blockers
span
span
\
before
div
h3
No-shows, cancellations and low LTV
span
_
p
Empty schedule slots, no prepayments or deposits, expensive acquisition and weak retention. 
b
BNPL for services is underdeveloped
— mid- and high-ticket spend leaks to competitors.
        
div
span
Beauty · Sport · Health · Auto
span
service SMB
div
span
\
span
paired with
span
_
div
div
b
altegio × fintech
span
span
\
after
div
h3
span
\
solution
p
b
Online prepayments, deposits, BNPL and QR payments
cut no-shows, fill empty slots and grow the average check. End users book, get notifications and pay for services inside the 
b
fintech app
; the business gets a new acquisition channel, prepayments and retention.
        
div
span
POS · Payments · Retention
span
fintech app
p
One platform that solves the merchant's pain and delivers 
b
acquiring-GMV growth, new SMB merchants
and recurring end-user touchpoints to the fintech partner.
  
section
div
span
span
\
span
benefits for fintech
span
span
03 / 06
div
div
p
With Altegio you can validate product-market fit at low cost, on top of hundreds of digitised SMB merchants already operating in service verticals across the country.
  
div
div
span
01 
span
\
gmv
h4
Acquiring-GMV uplift
p
Net-new volume from service verticals with frequent, recurring payments.
div
span
02 
span
\
merchants
h4
New SMB merchants
p
Access to digital businesses ready to plug in payments and BNPL out of the box.
div
span
03 
span
\
cross-sell
h4
Cross-sell
p
One merchant touchpoint, multiple fintech products: cards, BNPL, SME lending.
div
span
04 
span
\
retention
h4
MAU 
&
retention
p
Recurring scenarios — online booking, notifications, payments — bring the end user back into the bank's app.
div
div
div
div
div
span
\
region
div
button
Middle East
button
East Europe
button
West Europe
button
Latin America
button
Central Asia
div
div
span
\
business clients
div
input
input
div
div
span
01
strong
1
000
span
merchants in Beauty, Wellness, Sport, Health and Auto verticals
div
span
02
strong
4
780
span
service specialists providing the services
div
span
03
strong
248k
span
visits per month
div
span
04
strong
1.5m
span
SMS, WhatsApp and push notifications per month
div
span
05
strong
$14.7m
span
GMV per month
div
span
06
strong
24k
span
confirmation pages after online bookings
p
span
\
note 
span
forecast for 
span
Middle East
· 
span
500
business clients · source: Power BI "Altegio Main Metrics"
section
div
span
span
\
span
models
span
span
04 / 06
div
div
div
span
span
\
co-brand
span
commitment
b
free
ul
li
span
—
span
b
Co-branded bundle
of Altegio × FinTech, packaged with preferential terms for merchants.
li
span
—
span
b
Native integration
of the partner’s fintech rails into Altegio, with in-market exclusivity for the partnership term.
li
span
—
span
b
The FinTech partner
drives go-to-market — distribution, co-marketing and bundle sales via its local commercial team.
li
span
—
span
b
Altegio
runs implementation, merchant activation and Tier-1 support.
div
div
span
span
\
white-label
span
setup fee
b
$50k — $100k
ul
li
span
+
span
b
Launch under the FinTech partner’s brand
, distributed as part of its merchant proposition in the local market.
li
span
+
span
b
Altegio re-skins
the SaaS — domain, brand, UI, content and customer comms — to match the partner’s identity.
li
span
+
span
b
The FinTech partner
runs the full in-country delivery team: acquisition, sales, implementation and customer support.
li
span
+
span
b
Altegio
handles fintech-stack integration, partner-team enablement and ongoing L2 / platform-level support.
section
div
span
span
\
span
case
span
span
05 / 06
div
div
div
h2
Altegio × Uzum
span
_
p
Joint GTM launch in Uzbekistan: a bundle with exclusive terms, native POS integration, co-branded marketing, and sales driven by a unified team.
div
div
span
01
span
span
\
bundle
span
0% Uzum Visa acquiring, 30-day BNPL grace period, 30% discount on Altegio
div
span
02
span
span
\
integration
span
Uzum POS, QR, banking and BNPL natively embedded in Altegio
div
span
03
span
span
\
launch
span
offline event for 300+ entrepreneurs, co-branded landing page, performance marketing
div
span
04
span
span
\
sales
span
Uzum sales team — 4 full-time reps, warm and cold leads
div
img
section
div
span
span
\
span
contact
span
span
06 / 06
div
h2
Let's build the bundle
span
_
div
div
span
span
\
contact
span
Mike Kondakov
span
CBDO 
&
Co-founder, Altegio
a
partner@alteg.io
a
Start a conversation