'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  ClipboardCheck,
  Fingerprint,
  LayoutDashboard,
  ListChecks,
  MapPin,
  MessageSquare,
  ScanFace,
  Send,
  Shield,
  ShieldCheck,
  Smartphone,
  UserCheck,
  UsersRound,
  Wallet,
  Zap,
} from 'lucide-react';
import { getSession, resolveHomeRoute } from '@/lib/auth';
import { Globe } from '@/components/ui/globe';
import { BrandWordmark } from './brand-wordmark';

const features = [
  {
    icon: ScanFace,
    title: 'Biometric Attendance',
    desc: 'Selfie verification with liveness detection. GPS geofencing. One device per employee.',
  },
  {
    icon: CalendarCheck2,
    title: 'Smart Scheduling',
    desc: 'Shift templates, rotations, open shifts, swap workflows. Instant sync across the team.',
  },
  {
    icon: ListChecks,
    title: 'Tasks & Checklists',
    desc: 'Photo evidence, geo-tags, scoring. Auto-generated PDF reports on completion.',
  },
  {
    icon: CheckCircle2,
    title: 'Requests & Approvals',
    desc: 'Any request type with multi-step approval chains, SLA tracking, and full transparency.',
  },
  {
    icon: Wallet,
    title: 'Payroll Ready',
    desc: 'Overtime, night hours, penalties, holidays — calculated automatically. Export anywhere.',
  },
  {
    icon: MessageSquare,
    title: 'Team Communication',
    desc: 'Announcements, chat, polls, document acknowledgments — in one operational flow.',
  },
] as const;

const steps = [
  {
    num: '01',
    title: 'Set up your workspace',
    desc: 'Locations, departments, shifts, policies, approval chains — all in one place.',
  },
  {
    num: '02',
    title: 'Your team operates',
    desc: 'Biometric check-in, task completion, request submission — from the mobile app.',
  },
  {
    num: '03',
    title: 'You stay in control',
    desc: 'Real-time dashboards, anomaly alerts, audit trails. Issues resolved before payroll.',
  },
] as const;

const globeBadges = [
  { icon: ScanFace, title: 'Biometric verified', sub: 'Identity confirmed' },
  { icon: CalendarCheck2, title: 'Shift started', sub: 'On time' },
  { icon: MapPin, title: 'Location verified', sub: 'Within geofence' },
  { icon: ClipboardCheck, title: 'Task completed', sub: 'Checklist passed' },
  { icon: UserCheck, title: 'Employee onboarded', sub: 'Documents signed' },
  { icon: Send, title: 'Request approved', sub: 'Vacation confirmed' },
  { icon: CheckCircle2, title: 'Meeting scheduled', sub: 'Team sync at 10:00' },
  { icon: Shield, title: 'Audit passed', sub: 'No anomalies found' },
  { icon: Fingerprint, title: 'Device registered', sub: 'Primary device set' },
  { icon: Wallet, title: 'Payroll exported', sub: 'March report ready' },
  { icon: MessageSquare, title: 'Announcement sent', sub: 'Policy update' },
  { icon: ListChecks, title: 'Inspection done', sub: 'Score: 96/100' },
] as const;

const BADGE_POSITIONS = [
  { top: '10%', left: '25%' },
  { top: '6%', left: '46%' },
  { top: '15%', right: '22%' },
  { top: '35%', left: '18%' },
  { top: '50%', left: '28%' },
  { top: '40%', right: '20%' },
] as const;

type BadgeItem = {
  id: number;
  badgeIdx: number;
  posIdx: number;
  leaving: boolean;
  bobDelay: number;
};

let badgeId = 0;

function GlobeBadges() {
  const [items, setItems] = useState<BadgeItem[]>([]);

  useEffect(() => {
    const show = () => {
      setItems((prev) => {
        const active = prev.filter((b) => !b.leaving);
        const usedPos = new Set(active.map((v) => v.posIdx));
        const free = BADGE_POSITIONS.map((_, i) => i).filter((i) => !usedPos.has(i));
        if (free.length === 0) return prev;

        const posIdx = free[Math.floor(Math.random() * free.length)];
        const badgeIdx = Math.floor(Math.random() * globeBadges.length);

        return [
          ...prev,
          { id: ++badgeId, badgeIdx, posIdx, leaving: false, bobDelay: Math.random() * 3 },
        ];
      });
    };

    const hide = () => {
      setItems((prev) => {
        const active = prev.filter((b) => !b.leaving);
        if (active.length === 0) return prev;
        const target = active[Math.floor(Math.random() * active.length)];
        return prev.map((b) => (b.id === target.id ? { ...b, leaving: true } : b));
      });
    };

    // Clean up items that finished leaving
    const cleanup = setInterval(() => {
      setItems((prev) => prev.filter((b) => !b.leaving));
    }, 800);

    const init = setTimeout(() => {
      show();
      setTimeout(show, 500);
      setTimeout(show, 1100);
    }, 800);

    const interval = setInterval(() => {
      if (Math.random() > 0.45) show();
      else hide();
    }, 2200);

    return () => {
      clearTimeout(init);
      clearInterval(interval);
      clearInterval(cleanup);
    };
  }, []);

  return (
    <>
      {items.map((item) => {
        const badge = globeBadges[item.badgeIdx];
        const pos = BADGE_POSITIONS[item.posIdx];
        const Icon = badge.icon;
        return (
          <div
            key={item.id}
            className={`lp-float-card ${item.leaving ? 'lp-float-card--out' : 'lp-float-card--in'}`}
            style={{
              top: pos.top,
              left: 'left' in pos ? pos.left : undefined,
              right: 'right' in pos ? pos.right : undefined,
              animationDelay: item.leaving ? '0s' : `0s, ${item.bobDelay}s`,
            }}
          >
            <Icon className="size-4" />
            <div>
              <strong>{badge.title}</strong>
              <span>{badge.sub}</span>
            </div>
          </div>
        );
      })}
    </>
  );
}

const trust = [
  { icon: Fingerprint, title: 'Anti-Fraud', desc: 'Geofence + biometric + device binding' },
  { icon: Shield, title: 'Audit Trail', desc: 'Every action logged, nothing deleted' },
  { icon: ShieldCheck, title: 'Data Isolation', desc: 'Full tenant separation, GDPR-aware' },
  { icon: MapPin, title: 'GPS Proof', desc: 'Location verified on every check-in' },
] as const;

const mobilePlatform = [
  { icon: ScanFace, text: 'Biometric check-in with selfie & GPS' },
  { icon: CalendarCheck2, text: 'View schedule and claim open shifts' },
  { icon: ListChecks, text: 'Complete tasks with photo evidence' },
  { icon: CheckCircle2, text: 'Submit and track requests' },
  { icon: MessageSquare, text: 'Chat, announcements & polls' },
  { icon: Zap, text: 'Works offline with auto-sync' },
] as const;

const webPlatform = [
  { icon: LayoutDashboard, text: 'Real-time attendance dashboard' },
  { icon: UsersRound, text: 'Employee & org management' },
  { icon: CalendarCheck2, text: 'Visual schedule builder' },
  { icon: CheckCircle2, text: 'Approval chain configuration' },
  { icon: Wallet, text: 'Payroll reports & exports' },
  { icon: Shield, text: 'Full audit log of every action' },
] as const;

export function LandingPage() {
  const [primaryHref, setPrimaryHref] = useState('/login');
  const [primaryLabel, setPrimaryLabel] = useState('Open App');

  useEffect(() => {
    const session = getSession();
    if (!session) return;
    const nextHref = resolveHomeRoute(session.user.roleCodes);
    setPrimaryHref(nextHref);
    setPrimaryLabel(
      nextHref === '/employee' ? 'Open Employee App' : 'Open Workspace',
    );
  }, []);

  return (
    <div className="lp">
      <div className="lp-glow lp-glow--1" />
      <div className="lp-glow lp-glow--2" />

      {/* Nav */}
      <header className="lp-nav">
        <Link className="lp-logo" href="/">
          <span className="lp-logo-mark">H</span>
          <BrandWordmark className="lp-logo-text" />
        </Link>

        <nav className="lp-nav-links">
          <Link href="#features">Features</Link>
          <Link href="#how">How it works</Link>
          <Link href="#platform">Platform</Link>
        </nav>

        <Link className="lp-btn lp-btn--primary" href={primaryHref}>
          {primaryLabel}
          <ArrowRight className="size-4" />
        </Link>
      </header>

      {/* Hero */}
      <section className="lp-hero">
        <h1>
          One platform for{' '}
          <span className="lp-grad">attendance, schedules</span> and
          operations
        </h1>

        <div className="lp-hero-actions">
          <Link className="lp-btn lp-btn--primary lp-btn--lg" href={primaryHref}>
            Get Started
            <ArrowRight className="size-5" />
          </Link>
          <Link className="lp-btn lp-btn--outline lp-btn--lg" href="#how">
            See how it works
          </Link>
        </div>

        {/* Globe */}
        <div className="lp-globe-wrap">
          <Globe className="lp-globe-canvas" />
          <GlobeBadges />
        </div>

      </section>

      {/* Divider line */}
      <hr className="lp-hr" />

      {/* Features */}
      <section className="lp-block" id="features">
        <h2>
          Everything to{' '}
          <span className="lp-grad">run workforce operations</span>
        </h2>

        <div className="lp-grid-3">
          {features.map(({ icon: Icon, title, desc }) => (
            <article className="lp-feat" key={title}>
              <Icon className="size-7 lp-feat-ic" />
              <h3>{title}</h3>
              <p>{desc}</p>
            </article>
          ))}
        </div>
      </section>

      <hr className="lp-hr" />

      {/* How it works */}
      <section className="lp-block" id="how">
        <h2>
          From setup to <span className="lp-grad">full control</span> in three
          steps
        </h2>

        <div className="lp-grid-3">
          {steps.map(({ num, title, desc }) => (
            <article className="lp-step" key={num}>
              <span className="lp-step-num">{num}</span>
              <h3>{title}</h3>
              <p>{desc}</p>
            </article>
          ))}
        </div>
      </section>

      <hr className="lp-hr" />

      {/* Platform */}
      <section className="lp-block" id="platform">
        <h2>
          Mobile app <span className="lp-grad">&</span> Web admin
        </h2>
        <p className="lp-block-sub">
          Employees operate from their phones. Managers control everything from
          the web.
        </p>

        <div className="lp-plat">
          <div className="lp-plat-col">
            <h3>
              <Smartphone className="size-5" />
              Mobile App
            </h3>
            {mobilePlatform.map(({ icon: Icon, text }) => (
              <div className="lp-plat-row" key={text}>
                <Icon className="size-4 lp-plat-ic" />
                <span>{text}</span>
              </div>
            ))}
          </div>
          <div className="lp-plat-col">
            <h3>
              <LayoutDashboard className="size-5" />
              Web Admin
            </h3>
            {webPlatform.map(({ icon: Icon, text }) => (
              <div className="lp-plat-row" key={text}>
                <Icon className="size-4 lp-plat-ic" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="lp-hr" />

      {/* Trust */}
      <section className="lp-block">
        <h2>
          Built for <span className="lp-grad">trust & compliance</span>
        </h2>
        <div className="lp-grid-4">
          {trust.map(({ icon: Icon, title, desc }) => (
            <div className="lp-trust" key={title}>
              <Icon className="size-7 lp-trust-ic" />
              <strong>{title}</strong>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="lp-cta">
        <h2>Ready to streamline your operations?</h2>
        <p>Set up HiTeam in minutes. No credit card required.</p>
        <Link className="lp-btn lp-btn--primary lp-btn--lg" href={primaryHref}>
          Get Started Free
          <ArrowRight className="size-5" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-footer-top">
          <div className="lp-logo">
            <span className="lp-logo-mark">H</span>
            <BrandWordmark className="lp-logo-text" />
          </div>
          <div className="lp-footer-links">
            <Link href="#features">Features</Link>
            <Link href="#how">How it works</Link>
            <Link href="#platform">Platform</Link>
            <Link href="/login">Login</Link>
          </div>
        </div>
        <small>&copy; 2026 <BrandWordmark />. All rights reserved.</small>
      </footer>
    </div>
  );
}
