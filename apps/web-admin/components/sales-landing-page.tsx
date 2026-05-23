"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";
import Image from "next/image";
import { BrandWordmark } from "./brand-wordmark";
import { AppStoreButton, GooglePlayButton } from "./landing-page";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  readBrowserStorageItem,
  writeBrowserStorageItem,
} from "@/lib/browser-storage";
import { useI18n } from "@/lib/i18n";
import { getMockAvatarDataUrl } from "@/lib/mock-avatar";
import { cx } from "@/lib/utils/cx";

type LandingLocale = "en" | "ru" | "es" | "ar";
type PricingDurationKey = "monthly" | "six" | "year";
const LANDING_LOCALE_OPTIONS = ["en", "ru", "es", "ar"] as const;
const IOS_APP_URL =
  process.env.NEXT_PUBLIC_IOS_APP_URL ?? "https://apps.apple.com/";
const ANDROID_APP_URL =
  process.env.NEXT_PUBLIC_ANDROID_APP_URL ??
  "https://play.google.com/store/apps";
const LANGUAGE_NAMES: Record<LandingLocale, string> = {
  en: "English",
  ru: "Русский",
  es: "Español",
  ar: "العربية",
};
type FeatureIconName =
  | "clock"
  | "photo"
  | "tasks"
  | "field"
  | "news"
  | "birthday"
  | "rewards"
  | "schedule"
  | "reports";

type Copy = {
  dir: "ltr" | "rtl";
  languageLabel: string;
  nav: {
    how: string;
    cases: string;
    pricing: string;
    faq: string;
    signIn: string;
    start: string;
  };
  hero: {
    titleLines: string[];
    highlightIndex: number;
    subtitle: string;
    verified: string;
    mobile: string;
    primaryCta: string;
    secondaryCta: string;
    hardwareLabel: string;
    solutionLabel: string;
    smartphoneLabel: string;
    hardware: Array<{ icon: string; name: string; pain: string }>;
    stats: Array<{ value: string; label: string }>;
  };
  phone: {
    title: string;
    live: string;
    summary: Array<{
      value: string;
      label: string;
      tone: "green" | "amber" | "red";
    }>;
    teamLabel: string;
    checklistTitle: string;
    checklistProgress: string;
    photoLabel: string;
    rows: Array<{ done: boolean; text: string; photo?: boolean }>;
  };
  logos: { label: string; names: string[] };
  appStrip: {
    title: string;
    subtitle: string;
    appStore: string;
    googlePlay: string;
    kicker: string;
  };
  cost: {
    eyebrow: string;
    title: string;
    subtitle: string;
    cards: Array<{ icon: string; title: string; body: string }>;
    note: string;
  };
  problem: {
    eyebrow: string;
    title: string;
    subtitle: string;
    cards: Array<{ title: string; body: string }>;
    beforeTitle: string;
    afterTitle: string;
    before: string[];
    after: string[];
  };
  how: {
    eyebrow: string;
    title: string;
    subtitle: string;
    steps: Array<{ icon: string; title: string; body: string }>;
    proof: string;
  };
  cases: {
    eyebrow: string;
    title: string;
    subtitle: string;
    items: Array<{
      label: string;
      quote: string;
      author: string;
      resultLabel: string;
      results: string[];
      newsLabel: string;
      newsText: string;
    }>;
  };
  features: {
    eyebrow: string;
    title: string;
    items: Array<{ icon: string; title: string; body: string }>;
    bannerTitle: string;
    bannerBody: string;
    bad: string[];
    good: string[];
  };
  integrations: {
    eyebrow: string;
    title: string;
    subtitle: string;
    availableLabel: string;
    comingSoonLabel: string;
    available: Array<{
      icon: string;
      name: string;
      meta: string;
      contact?: boolean;
    }>;
    soon: Array<{ icon: string; name: string; meta: string; badge: string }>;
  };
  mobile: {
    eyebrow: string;
    titleLines: string[];
    body: string;
    bullets: string[];
  };
  pricing: {
    eyebrow: string;
    title: string;
    subtitle: string;
    calcTitle: string;
    calcSubtitle: string;
    employeesLabel: string;
    durationLabel: string;
    employeeUnit: string;
    durationLabels: Record<PricingDurationKey, string>;
    bonusLabels: Record<PricingDurationKey, string>;
    saveLabels: Record<PricingDurationKey, string>;
    perEmployee: string;
    oldPrefix: string;
    totalSuffix: string;
    cta: string;
    note: string;
  };
  testimonials: {
    eyebrow: string;
    title: string | string[];
    items: Array<{ quote: string; name: string; role: string }>;
  };
  faq: {
    eyebrow: string;
    title: string;
    items: Array<{ q: string; a: string }>;
  };
  cta: {
    title: string | string[];
    subtitle: string;
    primary: string;
    secondary: string;
    italic: string;
  };
  footer: {
    description: string;
    product: string;
    company: string;
    contacts: string;
    links: string[];
    legal: string[];
    copyright: string;
  };
  demo: {
    title: string;
    subtitle: string;
    name: string;
    email: string;
    phone: string;
    terms: string;
    button: string;
  };
};

const LANDING_LOCALE_STORAGE_KEY = "hiteam-landing-locale";
const EMPLOYEE_OPTIONS = [1, 2, 3, 5, 7, 10, 15, 20, 30, 50, 75, 100, 150, 200];
const TESTIMONIAL_AVATARS = [
  { seed: "Jessica Park", gender: "female" },
  { seed: "Amir Khalil", gender: "male" },
  { seed: "Sofia Mendes", gender: "female" },
] as const;
const FEATURE_ICON_NAMES: FeatureIconName[] = [
  "clock",
  "photo",
  "tasks",
  "field",
  "news",
  "birthday",
  "rewards",
  "schedule",
  "reports",
];
const PRICING_DURATIONS: Record<
  PricingDurationKey,
  { months: number; bonusMonths: number; unitPrice: number }
> = {
  monthly: { months: 1, bonusMonths: 0, unitPrice: 4 },
  six: { months: 6, bonusMonths: 1, unitPrice: 3.5 },
  year: { months: 12, bonusMonths: 2, unitPrice: 3 },
};

const COPY: Record<LandingLocale, Copy> = {
  en: {
    dir: "ltr",
    languageLabel: "Language",
    nav: {
      how: "How it works",
      cases: "Who it is for",
      pricing: "Pricing",
      faq: "FAQ",
      signIn: "Sign in",
      start: "Start free",
    },
    hero: {
      titleLines: ["Track attendance.", "No equipment", "ever needed"],
      highlightIndex: 1,
      subtitle:
        "See who arrived, when and where — in real time. Assign tasks, send company news, track your field team. Everything from the phone they already have.",
      verified: "If your employee has a smartphone — you're all set.",
      mobile: "Full control from the mobile app — iOS & Android",
      primaryCta: "Try free for 7 days →",
      secondaryCta: "Watch demo",
      hardwareLabel: "Replace all of this",
      solutionLabel: "Replace with one app",
      smartphoneLabel: "Smartphone",
      hardware: [
        {
          icon: "⌾",
          name: "Fingerprint scanner",
          pain: "Breaks. $800 to fix.",
        },
        { icon: "▣", name: "Access card", pain: "Always gets lost." },
        { icon: "☷", name: "NFC terminal", pain: "Needs maintenance." },
      ],
      stats: [
        { value: "99.8%", label: "Face accuracy" },
        { value: "2 sec", label: "Clock-in time" },
        { value: "$0", label: "Hardware cost" },
      ],
    },
    phone: {
      title: "Today shift - Tuesday",
      live: "Live",
      summary: [
        { value: "18", label: "On time", tone: "green" },
        { value: "3", label: "Late", tone: "amber" },
        { value: "1", label: "No show", tone: "red" },
      ],
      teamLabel: "Team today",
      checklistTitle: "Opening checklist",
      checklistProgress: "2/3",
      photoLabel: "photo",
      rows: [
        { done: true, text: "Stove cleaned", photo: true },
        { done: true, text: "Fridge checked", photo: true },
        { done: false, text: "Delivery logged" },
      ],
    },
    logos: {
      label: "Already used by",
      names: [
        "MAREA",
        "LUMIERE",
        "NEXFIELD",
        "OASIS GROUP",
        "VELOUR",
        "SKYBRIDGE",
      ],
    },
    appStrip: {
      title: "Download the HiTeam app",
      subtitle: "For employees and managers - iOS and Android",
      kicker: "Download on",
      appStore: "App Store",
      googlePlay: "Google Play",
    },
    cost: {
      eyebrow: "The real cost",
      title:
        "One late employee. One early exit. You pay for both every single day.",
      subtitle:
        "It is not just about punctuality. It is about money, reputation and the message it sends to the rest of your team.",
      cards: [
        {
          icon: "01",
          title: "Direct revenue loss",
          body: "Your restaurant opens at 9. Chef arrives at 9:20. Kitchen is not ready. First customers wait. Some leave and do not come back.",
        },
        {
          icon: "02",
          title: "Your team is watching",
          body: "When one person is late and nothing happens, others notice. Within weeks, 9:00 becomes 9:20.",
        },
        {
          icon: "03",
          title: "Early exits are invisible theft",
          body: "Shift ends at 18:00. Employee leaves at 17:40. Multiply that by a full team and a full year.",
        },
        {
          icon: "04",
          title: "Reward who shows up",
          body: "HiTeam shows exactly who arrives on time every day, so managers can reward the right people publicly.",
        },
      ],
      note: "HiTeam records the exact second your employee arrives — and the exact second they leave. Not approximately. Not on trust. Exactly.",
    },
    problem: {
      eyebrow: "The problem",
      title: "Running a team on trust alone is not working.",
      subtitle: "You sense something is off, but you have no proof. Until now.",
      cards: [
        {
          title: "You find out about lateness when it is already too late",
          body: "By the time you know, customers are waiting and the kitchen is not ready.",
        },
        {
          title: "Early exits are silent and invisible",
          body: "You pay for 8 hours and receive 7:40. The employee knows you cannot prove it.",
        },
        {
          title: "You feel who is slacking but cannot prove it",
          body: "Gut feeling against denial. Without data, every conversation becomes an argument.",
        },
      ],
      beforeTitle: "Before HiTeam",
      afterTitle: "With HiTeam",
      before: [
        "Fingerprint scanners that break",
        "Access cards that get lost",
        "WhatsApp where everything disappears",
        "Maintenance contracts and IT costs",
        "Gut feeling instead of data",
        "Early exits with no proof",
      ],
      after: [
        "Any smartphone - zero hardware",
        "Face recognition - cannot be faked",
        "Photo checklists with timestamp",
        "Works from day one - zero setup",
        "Facts, not feelings",
        "Exact clock-out time, always logged",
      ],
    },
    how: {
      eyebrow: "How it works",
      title: "Three steps. No training needed.",
      subtitle:
        "Your team is up and running in one day. No IT specialist, no equipment, no setup.",
      steps: [
        {
          icon: "01",
          title: "Employee arrives at work",
          body: "Opens HiTeam on their own phone. No card, no PIN, nothing to carry.",
        },
        {
          icon: "02",
          title: "Face + geolocation verified",
          body: "2 seconds. Face recognized and location confirmed inside the work zone.",
        },
        {
          icon: "03",
          title: "You see everything instantly",
          body: "Who is in, who is late, who has not shown. Pick any date and see the full picture.",
        },
      ],
      proof:
        "Cannot ask a colleague to clock in for you. The system verifies face and location simultaneously. Not on site - check-in will not go through.",
    },
    cases: {
      eyebrow: "Who it is for",
      title: "Built for teams that work in the real world.",
      subtitle:
        "Restaurants, salons, hotels, retail - anywhere people show up for a shift.",
      items: [
        {
          label: "Restaurant",
          quote:
            "My chef kept saying he arrived at 8. I'd come in and no one was there. He said I was mistaken.",
          author: "Jessica, restaurant owner, Dubai",
          resultLabel: "Now Jessica sees",
          results: [
            "Ahmed clocked in at 08:43 - 43 minutes late. Third time this month.",
            "Stove photo after shift: 21:17. Clean. Documented. No arguments.",
            "Best employee: Sofia. Zero late arrivals. Reward sent via app.",
          ],
          newsLabel: "Push notification - all staff",
          newsText:
            "Hi team. New uniforms have arrived. Pick yours up today at 16:30 in room 1.",
        },
        {
          label: "Beauty salon",
          quote:
            "I stopped checking chat screenshots. I see the station photo, time and person in one place.",
          author: "Sofia, salon owner",
          resultLabel: "Now Sofia sees",
          results: [
            "Kristina clocked in at 09:58. Station ready - photo at 09:59.",
            "Dmitri late again. Third time this month. Facts, not feelings.",
            "Overdue photo checklists flagged automatically.",
          ],
          newsLabel: "Push notification - team",
          newsText:
            "We are excited to welcome Alexa to our team. She joins as a nail technician.",
        },
        {
          label: "Hotel & office",
          quote:
            "Field routes and checklists finally became visible without calling every supervisor.",
          author: "Khalid, operations lead",
          resultLabel: "Now Khalid sees",
          results: [
            "Clock-in location confirmed at worksite. 09:02. Geolocation verified.",
            "Field route tracked. Three locations visited and logged during shift.",
            "Photo checklist submitted at each stop with timestamp.",
          ],
          newsLabel: "Push notification - all departments",
          newsText:
            "Starting August 1, all staff must complete Service & Communication training.",
        },
        {
          label: "Retail",
          quote:
            "The store opens on time because everyone knows the facts are visible immediately.",
          author: "Marcus, retail director",
          resultLabel: "Now Marcus sees",
          results: [
            "Store opens at 10:00. James arrived at 10:22 - customers were waiting.",
            "Layla clocked out at 17:38. Shift ends 18:00. 22 min short.",
            "Punctuality improved across all 3 stores after public rewards.",
          ],
          newsLabel: "Push notification - all stores",
          newsText:
            "New summer collection arrives Thursday. Rearrange the front display by Wednesday evening.",
        },
      ],
    },
    features: {
      eyebrow: "Features",
      title: "Everything you need. Nothing you do not.",
      items: [
        {
          icon: "⏱",
          title: "Real-time attendance — to the second",
          body: "Exact clock-in and clock-out for every employee.",
        },
        {
          icon: "▣",
          title: "Photo checklists",
          body: "Tasks completed with photo proof and timestamp.",
        },
        {
          icon: "☑",
          title: "Task management",
          body: "Assign individual tasks with deadlines and status.",
        },
        {
          icon: "⌁",
          title: "Field team tracking",
          body: "Route visibility during working hours only.",
        },
        {
          icon: "▰",
          title: "Company news feed",
          body: "Announcements delivered instantly as push notifications.",
        },
        {
          icon: "🎂",
          title: "Birthday reminders",
          body: "Managers never miss important team moments.",
        },
        {
          icon: "07",
          title: "Leaderboard & Rewards",
          body: "Rank punctuality and task results, then reward top performers.",
        },
        {
          icon: "▤",
          title: "Shift scheduling",
          body: "Build schedules, assign shifts and manage time off.",
        },
        {
          icon: "▥",
          title: "Reports & analytics",
          body: "Late arrivals, early exits and exports without spreadsheets.",
        },
      ],
      bannerTitle: "The only thing your employee needs is a phone.",
      bannerBody:
        "No card readers that get lost. No fingerprint scanners that break. No maintenance. No IT setup. One app — your whole team connected from day one.",
      bad: [
        "Fingerprint scanners",
        "Access cards",
        "QR terminals",
        "Maintenance costs",
      ],
      good: ["Just a smartphone"],
    },
    integrations: {
      eyebrow: "Integrations",
      title: "Works with the systems your clients already use.",
      subtitle:
        "HiTeam connects to your payroll, booking and ERP systems — so attendance data flows automatically without manual input.",
      availableLabel: "Available on request",
      comingSoonLabel: "Coming soon",
      available: [
        { icon: "bars", name: "1C / ZUP", meta: "Payroll · HR · CIS market" },
        { icon: "plate", name: "iiko / r_keeper", meta: "Restaurants · F&B" },
        { icon: "box", name: "Bitrix24 / МойСклад", meta: "Retail · SMB" },
        {
          icon: "building",
          name: "SAP HR / Oracle",
          meta: "Hotels · Enterprise",
        },
        {
          icon: "link",
          name: "Your system?",
          meta: "Contact us",
          contact: true,
        },
      ],
      soon: [
        {
          icon: "salon",
          name: "Altegio",
          meta: "Salons · Beauty · Spas",
          badge: "Soon",
        },
        {
          icon: "diamond",
          name: "Zoho CRM",
          meta: "SMB · UAE · Asia",
          badge: "Soon",
        },
        { icon: "orb", name: "Odoo", meta: "ERP · HR · Retail", badge: "Soon" },
      ],
    },
    mobile: {
      eyebrow: "Mobile app",
      titleLines: ["Everything in one app.", "For managers and employees."],
      body: "Free download. Works on any iPhone or Android.",
      bullets: [
        "Manager sees attendance, tasks and checklists in real time",
        "Send news and announcements — delivered as push instantly",
        "Employees receive tasks and submit photo proof",
        "Track field staff location during the shift",
        "Birthday reminders so you never miss a moment",
        "Leaderboard and rewards motivate the team automatically",
      ],
    },
    pricing: {
      eyebrow: "Pricing",
      title: "One rate. Pay per employee.",
      subtitle:
        "No feature tiers. Everyone gets everything. Pay based on team size and duration.",
      calcTitle: "Calculate your price",
      calcSubtitle: "Select team size and duration - updates instantly.",
      employeesLabel: "Team size",
      durationLabel: "License duration",
      employeeUnit: "employees",
      durationLabels: {
        monthly: "1 month",
        six: "6 months",
        year: "12 months",
      },
      bonusLabels: {
        monthly: "No bonus months",
        six: "+ 1 bonus month free",
        year: "+ 2 bonus months free",
      },
      saveLabels: { monthly: "Base rate", six: "Save 12%", year: "Save 25%" },
      perEmployee: "/ employee / month",
      oldPrefix: "vs $4.00 on monthly plan",
      totalSuffix: "total",
      cta: "Try for free",
      note: "Add employees mid-period? The system calculates the exact pro-rated amount automatically, bonus months included.",
    },
    testimonials: {
      eyebrow: "What managers say",
      title: ["They stopped guessing.", "Started knowing"],
      items: [
        {
          quote:
            "I used to argue about lateness every week. Now I open the app and show the timestamp. Conversation over in 30 seconds.",
          name: "Jessica Park",
          role: "Restaurant owner, Dubai",
        },
        {
          quote:
            "My field team covers three cities. I now see every check-in, every photo report, every location. In real time. Changed how I manage completely.",
          name: "Amir Khalil",
          role: "Operations manager, Abu Dhabi",
        },
        {
          quote:
            "We tried a fingerprint system. It broke in two months and cost $800 to fix. HiTeam costs less per year and has never gone down once.",
          name: "Sofia Mendes",
          role: "Salon administrator, London",
        },
      ],
    },
    faq: {
      eyebrow: "FAQ",
      title: "Common questions",
      items: [
        {
          q: "Do we need any special hardware or equipment?",
          a: "No. HiTeam works on any smartphone - iOS or Android. No card readers, scanners or extra devices.",
        },
        {
          q: "How does geolocation verification work?",
          a: "When an employee clocks in, the system checks that their phone is inside the configured work zone, usually 10-20 metres.",
        },
        {
          q: "How does face recognition work?",
          a: "The employee verifies identity inside the app before attendance actions, so the timestamp belongs to the right person.",
        },
        {
          q: "Can an employee clock in for a colleague?",
          a: "No. The system verifies face and location at the same time. Both must match.",
        },
        {
          q: "What are photo checklists?",
          a: "You create tasks, the employee completes them and attaches a photo as proof. You see the timestamped result.",
        },
        {
          q: "What happens when an employee leaves early?",
          a: "HiTeam records the exact clock-out time and flags early exits immediately.",
        },
        {
          q: "How does the rewards feature work?",
          a: "Managers can see punctuality and task results, then reward the employees who consistently meet the standard.",
        },
        {
          q: "Can I send announcements to my team?",
          a: "Yes. Company news is delivered to employees as push notifications inside the app.",
        },
        {
          q: "Does HiTeam remind me about employee birthdays?",
          a: "Yes. Birthday reminders are included so managers can recognize important team moments.",
        },
        {
          q: "What if our location has poor GPS signal?",
          a: "You can configure practical work zones and review check-ins with photo proof and timestamps.",
        },
        {
          q: "How does billing work when I add employees mid-period?",
          a: "The system calculates the exact pro-rated amount automatically, including bonus months.",
        },
        {
          q: "Is there a refund policy?",
          a: "Payments are final and non-refundable, which is why the product starts with a 7-day free trial.",
        },
      ],
    },
    cta: {
      title: ["7 days free.", "Set up in one day"],
      subtitle:
        "No contracts. No equipment. No IT specialist. Download the app and your team is tracked from the first shift.",
      primary: "Start free trial",
      secondary: "Book a demo",
      italic:
        "Every day without HiTeam is another day paying for time you are not getting.",
    },
    footer: {
      description:
        "Workforce management for teams that work in the real world. No hardware. No complexity.",
      product: "Product",
      company: "Company",
      contacts: "Legal",
      links: ["How it works", "Features", "Pricing", "App"],
      legal: ["Terms", "Privacy", "Cookies"],
      copyright:
        "© 2026 HiTeam · ALT TECHNOLOGIES L.L.C · Dubai, UAE · info@hiteam.net",
    },
    demo: {
      title: "Get demo",
      subtitle:
        "Leave your contacts and we will show how HiTeam fits your workflow.",
      name: "Your name",
      email: "Your email",
      phone: "Phone number (+...)",
      terms: "I agree to personal data processing and privacy policy.",
      button: "Request demo",
    },
  },
  ru: {
    dir: "ltr",
    languageLabel: "Язык",
    nav: {
      how: "Как работает",
      cases: "Для кого",
      pricing: "Цены",
      faq: "FAQ",
      signIn: "Войти",
      start: "Начать бесплатно",
    },
    hero: {
      titleLines: ["Отслеживайте", "посещаемость.", "Без оборудования."],
      highlightIndex: 2,
      subtitle:
        "Видите кто пришёл, во сколько и где — в реальном времени. Ставьте задачи, отправляйте новости компании, отслеживайте выездных сотрудников. Всё с телефона — вашего или их.",
      verified: "Если у сотрудника есть смартфон — этого достаточно.",
      mobile: "Полный контроль с мобильного приложения — iOS и Android",
      primaryCta: "Попробовать бесплатно 7 дней →",
      secondaryCta: "Смотреть демо",
      hardwareLabel: "Замените всё это",
      solutionLabel: "Замените одним приложением",
      smartphoneLabel: "Смартфон",
      hardware: [
        {
          icon: "⌾",
          name: "Сканер отпечатков",
          pain: "Ломается. Ремонт $800.",
        },
        { icon: "▣", name: "Карточка доступа", pain: "Постоянно теряется." },
        { icon: "☷", name: "NFC терминал", pain: "Требует обслуживания." },
      ],
      stats: [
        { value: "99.8%", label: "Точность распознавания" },
        { value: "2 сек", label: "Время отметки" },
        { value: "$0", label: "Стоимость оборудования" },
      ],
    },
    phone: {
      title: "Смена сегодня - вторник",
      live: "Онлайн",
      summary: [
        { value: "18", label: "Вовремя", tone: "green" },
        { value: "3", label: "Опоздали", tone: "amber" },
        { value: "1", label: "Не вышел", tone: "red" },
      ],
      teamLabel: "Команда сегодня",
      checklistTitle: "Чек-лист открытия",
      checklistProgress: "2/3",
      photoLabel: "фото",
      rows: [
        { done: true, text: "Плита убрана", photo: true },
        { done: true, text: "Холодильник проверен", photo: true },
        { done: false, text: "Поставка принята" },
      ],
    },
    logos: {
      label: "Нас уже используют",
      names: [
        "MAREA",
        "LUMIERE",
        "NEXFIELD",
        "OASIS GROUP",
        "VELOUR",
        "SKYBRIDGE",
      ],
    },
    appStrip: {
      title: "Скачайте приложение HiTeam",
      subtitle: "Для сотрудников и руководителей - iOS и Android",
      kicker: "Загрузить в",
      appStore: "App Store",
      googlePlay: "Google Play",
    },
    cost: {
      eyebrow: "Реальная стоимость",
      title: "Одно опоздание стоит дороже, чем вы думаете.",
      subtitle:
        "Один опоздавший. Один ранний уход. Вы платите за оба каждый день: деньгами, репутацией и дисциплиной команды.",
      cards: [
        {
          icon: "01",
          title: "Прямые потери выручки",
          body: "Ресторан открывается в 9. Повар приходит в 9:20. Кухня не готова. Первые гости ждут, часть уходит и не возвращается.",
        },
        {
          icon: "02",
          title: "Команда наблюдает",
          body: "Когда один опаздывает и ничего не происходит, остальные замечают. Через несколько недель 9:00 становится 9:20.",
        },
        {
          icon: "03",
          title: "Ранний уход - невидимая кража",
          body: "Смена до 18:00. Сотрудник уходит в 17:40. Умножьте это на команду и рабочий год.",
        },
        {
          icon: "04",
          title: "Поощряйте тех, кто приходит",
          body: "HiTeam показывает, кто стабильно приходит вовремя. Руководитель видит лучших и награждает их публично.",
        },
      ],
      note: "HiTeam фиксирует точную секунду, когда сотрудник пришёл, и точную секунду, когда он ушёл. Не примерно. Не на доверии. Точно.",
    },
    problem: {
      eyebrow: "Проблема",
      title: "Управлять командой на доверии больше не работает.",
      subtitle:
        "Вы чувствуете, что что-то не так, но не можете доказать. Теперь можете.",
      cards: [
        {
          title: "Вы узнаёте об опоздании, когда уже поздно",
          body: "Когда вы узнаёте, гости уже ждут, кухня не готова, каждая минута имеет цену.",
        },
        {
          title: "Ранний уход молчаливый и невидимый",
          body: "Вы платите за 8 часов, получаете 7:40. Сотрудник знает, что вы не можете доказать.",
        },
        {
          title: "Чувствуете кто халтурит, но не можете доказать",
          body: "Интуиция против отрицания. Без данных каждый разговор превращается в спор.",
        },
      ],
      beforeTitle: "До HiTeam",
      afterTitle: "С HiTeam",
      before: [
        "Сканеры, которые ломаются",
        "Карты, которые теряются",
        "WhatsApp, где всё пропадает",
        "Контракты на обслуживание и IT-расходы",
        "Ощущения вместо фактов",
        "Ранние уходы без доказательств",
      ],
      after: [
        "Любой смартфон - ноль оборудования",
        "Распознавание лица - нельзя подделать",
        "Фото-чек-листы с временем",
        "Работает с первого дня - без настройки",
        "Факты, не ощущения",
        "Точное время выхода всегда зафиксировано",
      ],
    },
    how: {
      eyebrow: "Как работает",
      title: "Три шага. Никакого обучения.",
      subtitle:
        "Команда запускается за один день. Без IT-специалиста, оборудования и сложной настройки.",
      steps: [
        {
          icon: "01",
          title: "Сотрудник приходит на работу",
          body: "Открывает HiTeam на своём телефоне. Никаких карточек и PIN-кодов.",
        },
        {
          icon: "02",
          title: "Распознавание лица + геолокация",
          body: "2 секунды. Лицо распознано, геолокация подтверждена внутри рабочей зоны.",
        },
        {
          icon: "03",
          title: "Вы видите это мгновенно",
          body: "Кто пришёл, кто опоздал, кто не вышел. Выберите любую дату и смотрите полную картину.",
        },
      ],
      proof:
        "Сотрудник не сможет попросить коллегу отметиться за него: система одновременно проверяет лицо и геолокацию. Не на месте — вход не принят.",
    },
    cases: {
      eyebrow: "Для кого",
      title: "Создан для команд, которые работают в реальном мире.",
      subtitle:
        "Рестораны, салоны, отели, ритейл - везде, где люди выходят на смену.",
      items: [
        {
          label: "Ресторан",
          quote:
            "Раньше я узнавал об опоздании, когда гости уже ждали. Теперь вижу сигнал до того, как проблема стала выручкой.",
          author: "Светлана, управляющая рестораном",
          resultLabel: "Теперь Светлана видит",
          results: [
            "Алексей отметился в 08:43 - опоздание 43 минуты. Третий раз за месяц.",
            "Фото чистой плиты после смены: 21:17. Задокументировано. Без споров.",
            "Лучший сотрудник: Дарья. Ноль опозданий. Вознаграждение отправлено через приложение.",
          ],
          newsLabel: "Push-уведомление — все сотрудники",
          newsText:
            "Коллеги, новая форма приехала. Забирайте сегодня в 16:30, кабинет 1.",
        },
        {
          label: "Салон красоты",
          quote:
            "Я перестала собирать скриншоты из чата. Вижу фото рабочего места, время и ответственного в одном месте.",
          author: "Анна, владелец салона",
          resultLabel: "Теперь Анна видит",
          results: [
            "Мария отметилась в 09:58. Рабочее место готово - фото в 09:59.",
            "Андрей снова опоздал. Третий раз за месяц. Факты, не ощущения.",
            "Просроченные фото-чек-листы подсвечиваются автоматически.",
          ],
          newsLabel: "Push-уведомление — команда",
          newsText:
            "К нашей команде присоединилась Алекса. Будет работать мастером маникюра.",
        },
        {
          label: "Отель и офис",
          quote:
            "Маршруты выездных сотрудников и чек-листы стали видны без звонков каждому супервайзеру.",
          author: "Халид, операционный руководитель",
          resultLabel: "Теперь Халид видит",
          results: [
            "Вход подтверждён на объекте. 09:02. Геолокация проверена автоматически.",
            "Маршрут выездного сотрудника отслежен. Три локации зафиксированы.",
            "Фото-чек-лист отправлен на каждой точке с точным временем.",
          ],
          newsLabel: "Push-уведомление — все отделы",
          newsText:
            "С 1 августа каждый сотрудник обязан пройти тренинг по сервису. Дедлайн: 31 июля.",
        },
        {
          label: "Ритейл",
          quote:
            "Магазин открывается вовремя, потому что команда знает: факты видны сразу.",
          author: "Марк, директор розницы",
          resultLabel: "Теперь Марк видит",
          results: [
            "Магазин открывается в 10:00. Иван пришёл в 10:22 - покупатели ждали у двери.",
            "Наташа ушла в 17:38. Смена до 18:00. 22 минуты недобора.",
            "После публичных наград пунктуальность выросла во всех трёх магазинах.",
          ],
          newsLabel: "Push-уведомление — все магазины",
          newsText:
            "Новая летняя коллекция приедет в четверг. Перекомпонуйте витрину к среде вечером.",
        },
      ],
    },
    features: {
      eyebrow: "Функции",
      title: "Всё, что нужно. Ничего лишнего.",
      items: [
        {
          icon: "⏱",
          title: "Посещаемость в реальном времени — до секунды",
          body: "Точный вход и выход каждого сотрудника.",
        },
        {
          icon: "▣",
          title: "Фото чек-листы",
          body: "Задачи закрываются фото с отметкой времени.",
        },
        {
          icon: "☑",
          title: "Управление задачами",
          body: "Индивидуальные задачи, сроки и статусы.",
        },
        {
          icon: "⌁",
          title: "Отслеживание выездных сотрудников",
          body: "Маршрут виден только во время рабочей смены.",
        },
        {
          icon: "▰",
          title: "Новостная лента компании",
          body: "Объявления уходят push-уведомлениями сразу.",
        },
        {
          icon: "🎂",
          title: "Напоминания о днях рождения",
          body: "Руководитель не пропускает важные даты команды.",
        },
        {
          icon: "07",
          title: "Рейтинг и вознаграждения",
          body: "Ранжируйте по пунктуальности и результатам.",
        },
        {
          icon: "▤",
          title: "Составление графиков смен",
          body: "Создавайте расписания и управляйте отпусками.",
        },
        {
          icon: "▥",
          title: "Отчёты и аналитика",
          body: "Опоздания, ранние уходы и экспорт без таблиц.",
        },
      ],
      bannerTitle: "Единственное, что нужно сотруднику, - телефон.",
      bannerBody:
        "Никаких картридеров, которые теряются. Никаких сканеров отпечатков, которые ломаются. Никакого обслуживания. Никакой IT-настройки. Одно приложение — вся команда подключена с первого дня.",
      bad: [
        "Сканеры отпечатков",
        "Карты доступа",
        "QR-терминалы",
        "Расходы на обслуживание",
      ],
      good: ["Только смартфон"],
    },
    integrations: {
      eyebrow: "Интеграции",
      title: "Работает с системами, которыми ваши клиенты уже пользуются.",
      subtitle:
        "HiTeam подключается к зарплатным, booking- и ERP-системам — данные посещаемости уходят автоматически, без ручного ввода.",
      availableLabel: "Доступно по запросу",
      comingSoonLabel: "Скоро",
      available: [
        { icon: "bars", name: "1C / ЗУП", meta: "Зарплата · HR · СНГ" },
        { icon: "plate", name: "iiko / r_keeper", meta: "Рестораны · F&B" },
        { icon: "box", name: "Bitrix24 / МойСклад", meta: "Ритейл · SMB" },
        {
          icon: "building",
          name: "SAP HR / Oracle",
          meta: "Отели · Enterprise",
        },
        {
          icon: "link",
          name: "Ваша система?",
          meta: "Связаться",
          contact: true,
        },
      ],
      soon: [
        {
          icon: "salon",
          name: "Altegio",
          meta: "Салоны · Beauty · Spas",
          badge: "Скоро",
        },
        {
          icon: "diamond",
          name: "Zoho CRM",
          meta: "SMB · UAE · Asia",
          badge: "Скоро",
        },
        {
          icon: "orb",
          name: "Odoo",
          meta: "ERP · HR · Retail",
          badge: "Скоро",
        },
      ],
    },
    mobile: {
      eyebrow: "Мобильное приложение",
      titleLines: [
        "Всё в одном приложении.",
        "Для руководителей и сотрудников.",
      ],
      body: "Бесплатная загрузка. Работает на любом iPhone или Android.",
      bullets: [
        "Руководитель видит посещаемость, задачи и чек-листы в реальном времени",
        "Новости и объявления доставляются push-уведомлением мгновенно",
        "Сотрудники получают задачи и отправляют фото-доказательства",
        "Отслеживание выездных сотрудников во время смены",
        "Напоминания о днях рождения, чтобы ничего не пропустить",
        "Рейтинг и вознаграждения автоматически мотивируют команду",
      ],
    },
    pricing: {
      eyebrow: "Цены",
      title: "Один тариф. Платите за каждого сотрудника.",
      subtitle:
        "Без тарифных уровней. Все функции доступны всем. Цена зависит от команды и срока лицензии.",
      calcTitle: "Рассчитайте вашу цену",
      calcSubtitle:
        "Выберите размер команды и срок лицензии - цена обновится сразу.",
      employeesLabel: "Размер команды",
      durationLabel: "Срок лицензии",
      employeeUnit: "сотрудников",
      durationLabels: {
        monthly: "1 месяц",
        six: "6 месяцев",
        year: "12 месяцев",
      },
      bonusLabels: {
        monthly: "Без бонусных месяцев",
        six: "+ 1 месяц в подарок",
        year: "+ 2 месяца в подарок",
      },
      saveLabels: {
        monthly: "Базовая ставка",
        six: "Экономия 12%",
        year: "Экономия 25%",
      },
      perEmployee: "/ сотрудник / месяц",
      oldPrefix: "vs $4.00 при оплате помесячно",
      totalSuffix: "всего",
      cta: "Попробовать бесплатно",
      note: "Добавляете сотрудников в середине периода? Система автоматически рассчитает сумму пропорционально оставшимся дням, включая бонусные месяцы.",
    },
    testimonials: {
      eyebrow: "Что говорят руководители",
      title: "Перестали догадываться. Начали знать.",
      items: [
        {
          quote:
            "Раньше я спорила об опозданиях каждую неделю. Теперь открываю приложение и показываю время. Разговор заканчивается за 30 секунд.",
          name: "Джессика Парк",
          role: "Владелец ресторана, Дубай",
        },
        {
          quote:
            "Моя выездная команда работает в трёх городах. Теперь я вижу каждый вход, каждый фотоотчёт и каждую локацию в реальном времени.",
          name: "Амир Халил",
          role: "Операционный менеджер, Абу-Даби",
        },
        {
          quote:
            "Мы пробовали систему отпечатков. Она сломалась через два месяца, ремонт стоил $800. HiTeam дешевле за год и ни разу не падал.",
          name: "София Мендес",
          role: "Администратор салона, Лондон",
        },
      ],
    },
    faq: {
      eyebrow: "FAQ",
      title: "Частые вопросы",
      items: [
        {
          q: "Нужно ли специальное оборудование?",
          a: "Нет. HiTeam работает на любом смартфоне iOS или Android. Никаких сканеров, карточек и дополнительных устройств.",
        },
        {
          q: "Как работает проверка геолокации?",
          a: "При отметке система проверяет, что телефон находится в рабочей зоне. Обычно это радиус 10-20 метров.",
        },
        {
          q: "Как работает распознавание лица?",
          a: "Сотрудник подтверждает личность в приложении перед отметкой, поэтому время привязано к конкретному человеку.",
        },
        {
          q: "Можно попросить коллегу отметиться за тебя?",
          a: "Нет. Система одновременно проверяет лицо и геолокацию. Оба условия должны совпасть.",
        },
        {
          q: "Что такое фото-чек-листы?",
          a: "Вы создаёте задачи, сотрудник закрывает их и прикладывает фото. Вы видите результат с точным временем.",
        },
        {
          q: "Что происходит при раннем уходе?",
          a: "HiTeam фиксирует точное время выхода и сразу показывает ранний уход руководителю.",
        },
        {
          q: "Как работает функция вознаграждений?",
          a: "Руководитель видит пунктуальность и выполнение задач, а затем награждает сотрудников, которые держат стандарт.",
        },
        {
          q: "Можно отправлять объявления команде?",
          a: "Да. Новости компании доставляются сотрудникам push-уведомлениями внутри приложения.",
        },
        {
          q: "HiTeam напоминает о днях рождения сотрудников?",
          a: "Да. Напоминания включены, чтобы руководитель не пропускал важные даты команды.",
        },
        {
          q: "Что если на локации плохой GPS?",
          a: "Можно настроить практичную рабочую зону и проверять отметки по фото-доказательствам и времени.",
        },
        {
          q: "Как считается оплата при добавлении сотрудника в середине периода?",
          a: "Система автоматически рассчитывает точную пропорциональную сумму, включая бонусные месяцы.",
        },
        {
          q: "Есть ли возврат?",
          a: "Все платежи финальные и не возвращаются, поэтому продукт начинается с 7-дневного бесплатного периода.",
        },
      ],
    },
    cta: {
      title: "7 дней бесплатно. Настройка за один день.",
      subtitle:
        "Без договоров. Без оборудования. Без IT-специалиста. Скачайте приложение, и команда под контролем с первой смены.",
      primary: "Начать бесплатно",
      secondary: "Заказать демо",
      italic:
        "Каждый день без HiTeam - это ещё один день, когда вы платите за время, которое не получаете.",
    },
    footer: {
      description:
        "Управление персоналом для команд, которые работают в реальном мире. Без оборудования и сложности.",
      product: "Продукт",
      company: "Компания",
      contacts: "Правовая информация",
      links: ["Как работает", "Функции", "Цены", "Приложение"],
      legal: ["Условия", "Конфиденциальность", "Cookies"],
      copyright:
        "© 2026 HiTeam · ALT TECHNOLOGIES L.L.C · Dubai, UAE · info@hiteam.net",
    },
    demo: {
      title: "Попробовать демо",
      subtitle:
        "Оставьте контакты, и мы покажем, как HiTeam будет работать именно у вас.",
      name: "Ваше имя",
      email: "Ваш email",
      phone: "Номер телефона (+...)",
      terms:
        "Я согласен на обработку персональных данных и политику конфиденциальности.",
      button: "Получить демо",
    },
  },
  es: {
    dir: "ltr",
    languageLabel: "Idioma",
    nav: {
      how: "Cómo funciona",
      cases: "Para quién",
      pricing: "Precios",
      faq: "FAQ",
      signIn: "Iniciar sesión",
      start: "Empezar gratis",
    },
    hero: {
      titleLines: ["Controla la asistencia.", "Sin equipos.", "Sin excusas."],
      highlightIndex: 1,
      subtitle:
        "Sabes quién llegó, a qué hora y dónde — en tiempo real. Asigna tareas, envía noticias y rastrea a tu equipo de campo. Todo desde el móvil.",
      verified: "Si tu empleado tiene un smartphone — ya estás listo.",
      mobile: "Control total desde la app móvil — iOS y Android",
      primaryCta: "Probar gratis 7 días →",
      secondaryCta: "Ver demo",
      hardwareLabel: "Reemplaza todo esto",
      solutionLabel: "Sustituye todo por una app",
      smartphoneLabel: "Móvil",
      hardware: [
        {
          icon: "⌾",
          name: "Lector de huella",
          pain: "Se rompe. $800 de reparación.",
        },
        { icon: "▣", name: "Tarjeta de acceso", pain: "Siempre se pierde." },
        {
          icon: "☷",
          name: "Terminal NFC",
          pain: "Necesita mantenimiento.",
        },
      ],
      stats: [
        { value: "99.8%", label: "Precisión facial" },
        { value: "2 seg", label: "Tiempo de registro" },
        { value: "$0", label: "Coste de hardware" },
      ],
    },
    phone: {
      title: "Turno de hoy - martes",
      live: "En vivo",
      summary: [
        { value: "18", label: "A tiempo", tone: "green" },
        { value: "3", label: "Tarde", tone: "amber" },
        { value: "1", label: "Ausente", tone: "red" },
      ],
      teamLabel: "Equipo hoy",
      checklistTitle: "Checklist de apertura",
      checklistProgress: "2/3",
      photoLabel: "foto",
      rows: [
        { done: true, text: "Cocina limpia", photo: true },
        { done: true, text: "Nevera revisada", photo: true },
        { done: false, text: "Entrega recibida" },
      ],
    },
    logos: {
      label: "Ya lo usan",
      names: ["MAREA", "LUMIERE", "NEXFIELD", "VELOUR", "SKYBRIDGE"],
    },
    appStrip: {
      title: "Descarga la app de HiTeam",
      subtitle: "Para empleados y managers - iOS y Android",
      kicker: "Descargar en",
      appStore: "App Store",
      googlePlay: "Google Play",
    },
    cost: {
      eyebrow: "El coste real",
      title: "Un empleado tarde cuesta más de lo que parece.",
      subtitle:
        "Una llegada tarde y una salida anticipada cuestan dinero, reputación y disciplina del equipo.",
      cards: [
        {
          icon: "01",
          title: "Pérdida directa de ingresos",
          body: "Tu restaurante abre a las 9. El cocinero llega a las 9:20. La cocina no está lista y los clientes esperan.",
        },
        {
          icon: "02",
          title: "Tu equipo observa",
          body: "Cuando alguien llega tarde y no pasa nada, los demás lo notan. Las 9:00 se convierten en 9:20.",
        },
        {
          icon: "03",
          title: "Las salidas anticipadas son invisibles",
          body: "Pagas un turno completo, pero recibes menos tiempo cada semana.",
        },
        {
          icon: "04",
          title: "Premia a quienes cumplen",
          body: "HiTeam muestra quién llega a tiempo y quién merece reconocimiento público.",
        },
      ],
      note: "HiTeam registra el segundo exacto en que el empleado llega y el segundo exacto en que se va. No aproximadamente. No por confianza. Exacto.",
    },
    problem: {
      eyebrow: "El problema",
      title: "Gestionar un equipo solo con confianza ya no funciona.",
      subtitle: "Sabes que algo falla, pero no tienes pruebas. Hasta ahora.",
      cards: [
        {
          title: "Te enteras demasiado tarde",
          body: "Cuando lo sabes, los clientes ya están esperando.",
        },
        {
          title: "Las salidas anticipadas no se ven",
          body: "Pagas 8 horas y recibes 7:40. No puedes probarlo.",
        },
        {
          title: "Sientes quién no rinde",
          body: "Sin datos, cada conversación se convierte en discusión.",
        },
      ],
      beforeTitle: "Antes de HiTeam",
      afterTitle: "Con HiTeam",
      before: [
        "Lectores que fallan",
        "Tarjetas perdidas",
        "WhatsApp donde todo desaparece",
        "Contratos de mantenimiento y costes de TI",
        "Sensaciones en vez de datos",
        "Salidas anticipadas sin prueba",
      ],
      after: [
        "Cualquier móvil - cero hardware",
        "Verificación facial - no se puede falsificar",
        "Fotos con hora",
        "Funciona desde el primer día",
        "Datos reales",
        "Hora exacta de salida registrada",
      ],
    },
    how: {
      eyebrow: "Cómo funciona",
      title: "Tres pasos. Sin formación necesaria.",
      subtitle:
        "Tu equipo empieza en un día. Sin especialista de TI, sin equipos, sin configuración compleja.",
      steps: [
        {
          icon: "01",
          title: "El empleado llega al trabajo",
          body: "Abre HiTeam en su móvil. Sin tarjeta ni PIN.",
        },
        {
          icon: "02",
          title: "Rostro + ubicación",
          body: "2 segundos. Rostro reconocido y zona de trabajo confirmada.",
        },
        {
          icon: "03",
          title: "Lo ves al instante",
          body: "Quién llegó, quién tarde y quién no apareció.",
        },
      ],
      proof:
        "No se puede pedir a un compañero que fiche por ti. El sistema verifica rostro y ubicación al mismo tiempo.",
    },
    cases: {
      eyebrow: "Para quién",
      title: "Construido para equipos que trabajan en el mundo real.",
      subtitle: "Restaurantes, salones, hoteles y retail.",
      items: [
        {
          label: "Restaurante",
          quote:
            "La alerta llega antes de que el retraso afecte a los clientes.",
          author: "Elena, manager",
          resultLabel: "Ahora Elena ve",
          results: [
            "Carlos fichó a las 08:43 - 43 minutos tarde.",
            "Foto de cocina limpia a las 21:17.",
            "Mejor empleada: Isabel. Cero retrasos.",
          ],
          newsLabel: "Push - todo el equipo",
          newsText: "Los uniformes nuevos han llegado. Recogida a las 16:30.",
        },
        {
          label: "Salón",
          quote:
            "Veo la estación, la hora y la persona responsable sin perseguir mensajes.",
          author: "Sofía, dueña",
          resultLabel: "Ahora Sofía ve",
          results: [
            "Lucía fichó a las 09:58.",
            "Miguel tarde otra vez.",
            "Checklist con foto pendiente.",
          ],
          newsLabel: "Push - equipo",
          newsText: "Alejandra se incorpora como técnica de uñas.",
        },
        {
          label: "Hotel",
          quote: "Las rutas del equipo de campo por fin están claras.",
          author: "Javier, operaciones",
          resultLabel: "Ahora Javier ve",
          results: [
            "Fichaje confirmado en obra a las 09:02.",
            "Tres ubicaciones visitadas.",
            "Checklist enviado en cada parada.",
          ],
          newsLabel: "Push - departamentos",
          newsText: "Formación obligatoria de Servicio antes del 31 de julio.",
        },
        {
          label: "Retail",
          quote: "La tienda abre a tiempo porque todos ven los hechos.",
          author: "Marco, director retail",
          resultLabel: "Ahora Marco ve",
          results: [
            "Pablo llegó a las 10:22.",
            "Lucía salió a las 17:38.",
            "Puntualidad mejoró en 3 tiendas.",
          ],
          newsLabel: "Push - tiendas",
          newsText:
            "Nueva colección llega jueves. Escaparate listo el miércoles.",
        },
      ],
    },
    features: {
      eyebrow: "Funcionalidades",
      title: "Todo lo necesario. Nada de más.",
      items: [
        {
          icon: "⏱",
          title: "Asistencia en tiempo real — al segundo",
          body: "Entradas y salidas exactas.",
        },
        {
          icon: "▣",
          title: "Listas de verificación con fotos",
          body: "Prueba visual con hora.",
        },
        {
          icon: "☑",
          title: "Gestión de tareas",
          body: "Responsables, plazos y estado.",
        },
        {
          icon: "⌁",
          title: "Seguimiento del equipo de campo",
          body: "Rutas visibles durante el turno.",
        },
        {
          icon: "▰",
          title: "Feed de noticias de la empresa",
          body: "Anuncios push instantáneos.",
        },
        {
          icon: "🎂",
          title: "Recordatorios de cumpleaños",
          body: "Nunca se pierden momentos importantes del equipo.",
        },
        {
          icon: "07",
          title: "Clasificación y Recompensas",
          body: "Premia puntualidad y resultados.",
        },
        {
          icon: "▤",
          title: "Programación de turnos",
          body: "Calendarios y ausencias.",
        },
        {
          icon: "▥",
          title: "Informes y análisis",
          body: "Exportaciones sin hojas manuales.",
        },
      ],
      bannerTitle: "Lo único que necesita tu empleado es un móvil.",
      bannerBody:
        "Sin lectores de tarjetas que se pierden. Sin lectores de huella que se rompen. Sin mantenimiento. Sin configuración de TI. Una app — todo tu equipo conectado desde el primer día.",
      bad: [
        "Lectores de huella",
        "Tarjetas de acceso",
        "Terminales QR",
        "Costes de mantenimiento",
      ],
      good: ["Solo un móvil"],
    },
    integrations: {
      eyebrow: "Integraciones",
      title: "Funciona con los sistemas que tus clientes ya usan.",
      subtitle:
        "HiTeam se conecta a nómina, reservas y ERP para que los datos de asistencia fluyan automáticamente sin carga manual.",
      availableLabel: "Disponible bajo solicitud",
      comingSoonLabel: "Próximamente",
      available: [
        { icon: "bars", name: "1C / ZUP", meta: "Nómina · HR · CIS" },
        { icon: "plate", name: "iiko / r_keeper", meta: "Restaurantes · F&B" },
        { icon: "box", name: "Bitrix24 / МойСклад", meta: "Retail · SMB" },
        {
          icon: "building",
          name: "SAP HR / Oracle",
          meta: "Hoteles · Enterprise",
        },
        {
          icon: "link",
          name: "¿Tu sistema?",
          meta: "Contáctanos",
          contact: true,
        },
      ],
      soon: [
        {
          icon: "salon",
          name: "Altegio",
          meta: "Salones · Beauty · Spas",
          badge: "Pronto",
        },
        {
          icon: "diamond",
          name: "Zoho CRM",
          meta: "SMB · UAE · Asia",
          badge: "Pronto",
        },
        {
          icon: "orb",
          name: "Odoo",
          meta: "ERP · HR · Retail",
          badge: "Pronto",
        },
      ],
    },
    mobile: {
      eyebrow: "App móvil",
      titleLines: ["Todo en una app.", "Para managers y empleados."],
      body: "Descarga gratis. Funciona en cualquier iPhone o Android.",
      bullets: [
        "El manager ve asistencia, tareas y checklists en tiempo real",
        "Envía noticias y anuncios como push al instante",
        "Los empleados reciben tareas y envían evidencia fotográfica",
        "Seguimiento de personal de campo durante el turno",
        "Recordatorios de cumpleaños para no perder ningún momento",
        "Clasificación y recompensas motivan al equipo automáticamente",
      ],
    },
    pricing: {
      eyebrow: "Precios",
      title: "Una tarifa. Pagas por empleado.",
      subtitle: "Sin niveles de funciones. Todos reciben todo.",
      calcTitle: "Calcula tu precio",
      calcSubtitle: "Elige tamaño del equipo y duración.",
      employeesLabel: "Tamaño del equipo",
      durationLabel: "Duración",
      employeeUnit: "empleados",
      durationLabels: { monthly: "1 mes", six: "6 meses", year: "12 meses" },
      bonusLabels: {
        monthly: "Sin meses extra",
        six: "+ 1 mes gratis",
        year: "+ 2 meses gratis",
      },
      saveLabels: {
        monthly: "Tarifa base",
        six: "Ahorra 12%",
        year: "Ahorra 25%",
      },
      perEmployee: "/ empleado / mes",
      oldPrefix: "vs $4.00 en plan mensual",
      totalSuffix: "total",
      cta: "Probar gratis",
      note: "Si agregas empleados a mitad de periodo, el sistema calcula el importe proporcional.",
    },
    testimonials: {
      eyebrow: "Qué dicen los managers",
      title: "Dejaron de adivinar. Empezaron a saber.",
      items: [
        {
          quote:
            "Antes discutía los retrasos cada semana. Ahora abro la app y muestro la hora. La conversación termina en 30 segundos.",
          name: "Jessica Park",
          role: "Dueña de restaurante, Dubai",
        },
        {
          quote:
            "Mi equipo de campo cubre tres ciudades. Ahora veo cada check-in, cada foto y cada ubicación en tiempo real.",
          name: "Amir Khalil",
          role: "Manager de operaciones, Abu Dhabi",
        },
        {
          quote:
            "Probamos un sistema de huellas. Se rompió en dos meses y costó $800 repararlo. HiTeam cuesta menos por año.",
          name: "Sofia Mendes",
          role: "Administradora de salón, Londres",
        },
      ],
    },
    faq: {
      eyebrow: "FAQ",
      title: "Preguntas comunes",
      items: [
        {
          q: "¿Necesitamos equipos especiales?",
          a: "No. HiTeam funciona en cualquier smartphone iOS o Android.",
        },
        {
          q: "¿Cómo funciona la geolocalización?",
          a: "El sistema confirma que el móvil está dentro de la zona de trabajo configurada.",
        },
        {
          q: "¿Cómo funciona la verificación facial?",
          a: "El empleado confirma su identidad en la app antes de registrar asistencia.",
        },
        {
          q: "¿Puede fichar un compañero?",
          a: "No. Rostro y ubicación deben coincidir al mismo tiempo.",
        },
        {
          q: "¿Qué son los checklists con foto?",
          a: "Tareas con evidencia fotográfica y hora exacta.",
        },
        {
          q: "¿Qué pasa con una salida anticipada?",
          a: "Se registra automáticamente y aparece como alerta.",
        },
        {
          q: "¿Cómo funcionan las recompensas?",
          a: "El manager ve puntualidad y tareas completadas, y premia a quienes mantienen el estándar.",
        },
        {
          q: "¿Puedo enviar anuncios al equipo?",
          a: "Sí. Las noticias de empresa llegan como notificaciones push.",
        },
        {
          q: "¿HiTeam recuerda cumpleaños?",
          a: "Sí. Los recordatorios de cumpleaños están incluidos.",
        },
        {
          q: "¿Qué pasa si el GPS es débil?",
          a: "Puedes configurar zonas prácticas y revisar registros con fotos y hora.",
        },
        {
          q: "¿Cómo se cobra al agregar empleados a mitad de periodo?",
          a: "El sistema calcula automáticamente el importe proporcional.",
        },
        {
          q: "¿Hay reembolso?",
          a: "Los pagos son finales; por eso hay prueba gratuita de 7 días.",
        },
      ],
    },
    cta: {
      title: "7 días gratis. Configuración en un día.",
      subtitle: "Sin contratos. Sin equipos. Sin especialista de TI.",
      primary: "Empezar prueba gratis",
      secondary: "Reservar demo",
      italic:
        "Cada día sin HiTeam es otro día pagando por tiempo que no recibes.",
    },
    footer: {
      description:
        "Gestión de personal para equipos que trabajan en el mundo real.",
      product: "Producto",
      company: "Empresa",
      contacts: "Legal",
      links: ["Cómo funciona", "Funcionalidades", "Precios", "App"],
      legal: ["Términos", "Privacidad", "Cookies"],
      copyright:
        "© 2026 HiTeam · ALT TECHNOLOGIES L.L.C · Dubai, UAE · info@hiteam.net",
    },
    demo: {
      title: "Solicitar demo",
      subtitle:
        "Deja tus datos y te mostraremos HiTeam para tu flujo de trabajo.",
      name: "Tu nombre",
      email: "Tu email",
      phone: "Teléfono (+...)",
      terms:
        "Acepto el tratamiento de datos personales y la política de privacidad.",
      button: "Solicitar demo",
    },
  },
  ar: {
    dir: "rtl",
    languageLabel: "اللغة",
    nav: {
      how: "كيف يعمل",
      cases: "لمن",
      pricing: "الأسعار",
      faq: "الأسئلة",
      signIn: "تسجيل الدخول",
      start: "ابدأ مجاناً",
    },
    hero: {
      titleLines: ["تتبّع حضور موظفيك.", "بدون أي أجهزة."],
      highlightIndex: 1,
      subtitle:
        "اعرف من وصل، ومتى، وأين — في الوقت الفعلي. عيّن المهام، أرسل أخبار الشركة، وتتبع فريقك الميداني. كل شيء من الهاتف.",
      verified: "إذا كان لدى الموظف هاتف ذكي — فأنت جاهز.",
      mobile: "تحكم كامل من تطبيق الجوال — iOS و Android",
      primaryCta: "جرّب مجاناً 7 أيام →",
      secondaryCta: "شاهد العرض",
      hardwareLabel: "استبدل كل هذا",
      solutionLabel: "استبدلها بتطبيق واحد",
      smartphoneLabel: "هاتف ذكي",
      hardware: [
        { icon: "⌾", name: "ماسح البصمة", pain: "يتعطل. إصلاح $800." },
        { icon: "▣", name: "بطاقة الدخول", pain: "تضيع دائماً." },
        { icon: "☷", name: "جهاز NFC", pain: "يحتاج صيانة." },
      ],
      stats: [
        { value: "99.8%", label: "دقة التعرف" },
        { value: "ثانيتان", label: "وقت التسجيل" },
        { value: "$0", label: "تكلفة الأجهزة" },
      ],
    },
    phone: {
      title: "وردية اليوم - الثلاثاء",
      live: "مباشر",
      summary: [
        { value: "18", label: "في الوقت", tone: "green" },
        { value: "3", label: "متأخر", tone: "amber" },
        { value: "1", label: "غائب", tone: "red" },
      ],
      teamLabel: "فريق اليوم",
      checklistTitle: "قائمة الافتتاح",
      checklistProgress: "2/3",
      photoLabel: "صورة",
      rows: [
        { done: true, text: "الموقد نظيف", photo: true },
        { done: true, text: "الثلاجة مفحوصة", photo: true },
        { done: false, text: "تم استلام التوريد" },
      ],
    },
    logos: {
      label: "يثق بنا",
      names: ["MAREA", "LUMIERE", "NEXFIELD", "OASIS GROUP", "VELOUR"],
    },
    appStrip: {
      title: "حمّل تطبيق HiTeam",
      subtitle: "للموظفين والمديرين - iOS و Android",
      kicker: "تحميل من",
      appStore: "App Store",
      googlePlay: "Google Play",
    },
    cost: {
      eyebrow: "التكلفة الحقيقية",
      title: "موظف واحد متأخر يكلف أكثر مما تعتقد.",
      subtitle:
        "تأخير واحد ومغادرة مبكرة واحدة تعني مالاً وسمعة وانضباطاً أقل.",
      cards: [
        {
          icon: "01",
          title: "خسارة مباشرة في الإيرادات",
          body: "المطعم يفتح الساعة 9 والطاهي يصل 9:20. العملاء ينتظرون وبعضهم لا يعود.",
        },
        {
          icon: "02",
          title: "فريقك يراقب",
          body: "حين يتأخر أحدهم ولا يحدث شيء، الباقون يلاحظون.",
        },
        {
          icon: "03",
          title: "المغادرة المبكرة غير مرئية",
          body: "تدفع لوردية كاملة وتحصل على وقت أقل كل أسبوع.",
        },
        {
          icon: "04",
          title: "كافئ الملتزمين",
          body: "HiTeam يوضح من يحضر في الوقت ويستحق التقدير.",
        },
      ],
      note: "يسجل HiTeam الثانية الدقيقة التي يصل فيها الموظف والثانية الدقيقة التي يغادر فيها. ليس تقريباً. ليس على الثقة. بدقة.",
    },
    problem: {
      eyebrow: "المشكلة",
      title: "إدارة الفريق على أساس الثقة وحدها لم تعد تنجح.",
      subtitle: "تشعر أن هناك مشكلة، لكن لا تملك دليلاً. الآن تملك.",
      cards: [
        {
          title: "تعرف بالتأخير بعد فوات الأوان",
          body: "حين تعلم، العملاء ينتظرون بالفعل.",
        },
        {
          title: "المغادرة المبكرة صامتة",
          body: "تدفع مقابل 8 ساعات وتحصل على 7:40.",
        },
        {
          title: "تشعر بمن يتقاعس",
          body: "بدون بيانات، كل محادثة تتحول إلى جدال.",
        },
      ],
      beforeTitle: "قبل HiTeam",
      afterTitle: "مع HiTeam",
      before: [
        "ماسحات تتعطل",
        "بطاقات تضيع",
        "واتساب حيث يختفي كل شيء",
        "عقود صيانة وتكاليف تقنية",
        "إحساس بدلاً من بيانات",
        "مغادرة مبكرة بلا دليل",
      ],
      after: [
        "أي هاتف - بدون أجهزة",
        "تحقق بالوجه لا يمكن تزويره",
        "صور مع وقت",
        "يعمل من اليوم الأول",
        "حقائق",
        "وقت خروج دقيق ومسجل دائماً",
      ],
    },
    how: {
      eyebrow: "كيف يعمل",
      title: "ثلاث خطوات. لا تدريب مطلوب.",
      subtitle: "فريقك يبدأ خلال يوم واحد. بدون أجهزة أو إعداد تقني معقد.",
      steps: [
        {
          icon: "01",
          title: "يصل الموظف للعمل",
          body: "يفتح HiTeam على هاتفه. لا بطاقة ولا رمز.",
        },
        {
          icon: "02",
          title: "الوجه + الموقع",
          body: "ثانيتان. يتم تأكيد الهوية والمكان داخل منطقة العمل.",
        },
        {
          icon: "03",
          title: "ترى كل شيء فوراً",
          body: "من حضر، من تأخر، ومن لم يظهر.",
        },
      ],
      proof:
        "لا يمكن لأحد تسجيل حضور زميله. النظام يتحقق من الوجه والموقع معاً.",
    },
    cases: {
      eyebrow: "لمن هذا النظام",
      title: "مصمم للفرق التي تعمل في العالم الحقيقي.",
      subtitle: "مطاعم، صالونات، فنادق وتجزئة.",
      items: [
        {
          label: "مطعم",
          quote: "التنبيه يصل قبل أن يتحول التأخير إلى خسارة.",
          author: "جيسيكا، مديرة مطعم",
          resultLabel: "الآن جيسيكا ترى",
          results: [
            "أحمد سجل 08:43 - متأخر 43 دقيقة.",
            "صورة الموقد بعد الوردية 21:17.",
            "أفضل موظفة: فاطمة. لا تأخير.",
          ],
          newsLabel: "إشعار - كل الفريق",
          newsText: "وصل الزي الموحد الجديد. الاستلام 16:30.",
        },
        {
          label: "صالون",
          quote: "أرى المكان والوقت والمسؤول بدون رسائل متفرقة.",
          author: "سارة، مالكة صالون",
          resultLabel: "الآن سارة ترى",
          results: [
            "مريم سجلت 09:58.",
            "خالد متأخر مرة أخرى.",
            "قائمة الصور متأخرة.",
          ],
          newsLabel: "إشعار - الفريق",
          newsText: "نورة تنضم كفنية أظافر.",
        },
        {
          label: "فندق",
          quote: "مسارات الفريق الميداني أصبحت واضحة.",
          author: "أحمد، عمليات",
          resultLabel: "الآن أحمد يرى",
          results: [
            "تسجيل في الموقع 09:02.",
            "ثلاث مواقع تم زيارتها.",
            "صورة في كل توقف.",
          ],
          newsLabel: "إشعار - كل الأقسام",
          newsText: "تدريب الخدمة إلزامي قبل 31 يوليو.",
        },
        {
          label: "تجزئة",
          quote: "المتجر يفتح في الوقت لأن الحقائق مرئية.",
          author: "مارك، مدير تجزئة",
          resultLabel: "الآن مارك يرى",
          results: [
            "إبراهيم وصل 10:22.",
            "ناتاشا خرجت 17:38.",
            "تحسنت الدقة في 3 متاجر.",
          ],
          newsLabel: "إشعار - المتاجر",
          newsText: "مجموعة الصيف تصل الخميس. العرض جاهز الأربعاء.",
        },
      ],
    },
    features: {
      eyebrow: "المميزات",
      title: "كل ما تحتاجه. لا شيء زائد.",
      items: [
        {
          icon: "⏱",
          title: "الحضور في الوقت الفعلي — بالثانية",
          body: "دخول وخروج دقيق لكل موظف.",
        },
        { icon: "▣", title: "قوائم المهام بالصور", body: "دليل مرئي مع وقت." },
        { icon: "☑", title: "إدارة المهام", body: "مسؤوليات ومواعيد وحالة." },
        {
          icon: "⌁",
          title: "تتبع الفريق الميداني",
          body: "مسارات أثناء الوردية فقط.",
        },
        { icon: "▰", title: "خلاصة أخبار الشركة", body: "إشعارات فورية." },
        {
          icon: "🎂",
          title: "تذكيرات أعياد الميلاد",
          body: "لا تفوّت اللحظات المهمة للفريق.",
        },
        {
          icon: "07",
          title: "لوحة المتصدرين والمكافآت",
          body: "كافئ الالتزام والنتائج.",
        },
        { icon: "▤", title: "جدولة الورديات", body: "ورديات وإجازات." },
        {
          icon: "▥",
          title: "التقارير والتحليلات",
          body: "تصدير وتحليلات بدون جداول يدوية.",
        },
      ],
      bannerTitle: "الشيء الوحيد الذي يحتاجه الموظف هو هاتف.",
      bannerBody:
        "بدون قارئات بطاقات تضيع. بدون ماسحات بصمة تتعطل. بدون صيانة. بدون إعداد تقني. تطبيق واحد — فريقك كله متصل من اليوم الأول.",
      bad: ["ماسحات البصمة", "بطاقات الدخول", "أجهزة QR", "تكاليف الصيانة"],
      good: ["هاتف ذكي فقط"],
    },
    integrations: {
      eyebrow: "التكاملات",
      title: "يعمل مع الأنظمة التي يستخدمها عملاؤك بالفعل.",
      subtitle:
        "يتصل HiTeam بأنظمة الرواتب والحجوزات و ERP لتنتقل بيانات الحضور تلقائياً بدون إدخال يدوي.",
      availableLabel: "متاح عند الطلب",
      comingSoonLabel: "قريباً",
      available: [
        { icon: "bars", name: "1C / ZUP", meta: "رواتب · HR · CIS" },
        { icon: "plate", name: "iiko / r_keeper", meta: "مطاعم · F&B" },
        { icon: "box", name: "Bitrix24 / МойСклад", meta: "تجزئة · SMB" },
        {
          icon: "building",
          name: "SAP HR / Oracle",
          meta: "فنادق · Enterprise",
        },
        { icon: "link", name: "نظامك؟", meta: "تواصل معنا", contact: true },
      ],
      soon: [
        {
          icon: "salon",
          name: "Altegio",
          meta: "صالونات · Beauty · Spas",
          badge: "قريباً",
        },
        {
          icon: "diamond",
          name: "Zoho CRM",
          meta: "SMB · UAE · Asia",
          badge: "قريباً",
        },
        {
          icon: "orb",
          name: "Odoo",
          meta: "ERP · HR · Retail",
          badge: "قريباً",
        },
      ],
    },
    mobile: {
      eyebrow: "تطبيق الجوال",
      titleLines: ["كل شيء في تطبيق واحد.", "للمديرين والموظفين."],
      body: "تحميل مجاني. يعمل على أي iPhone أو Android.",
      bullets: [
        "يرى المدير الحضور والمهام والقوائم في الوقت الفعلي",
        "إرسال الأخبار والإعلانات كإشعار فوري",
        "يتلقى الموظفون المهام ويرسلون إثباتاً بالصور",
        "تتبع الموظفين الميدانيين أثناء الوردية",
        "تذكيرات أعياد الميلاد حتى لا تفوّت لحظة مهمة",
        "لوحة المتصدرين والمكافآت تحفز الفريق تلقائياً",
      ],
    },
    pricing: {
      eyebrow: "الأسعار",
      title: "سعر واحد. تدفع لكل موظف.",
      subtitle: "لا مستويات للميزات. كل شيء متاح للجميع.",
      calcTitle: "احسب سعرك",
      calcSubtitle: "اختر حجم الفريق والمدة.",
      employeesLabel: "حجم الفريق",
      durationLabel: "مدة الترخيص",
      employeeUnit: "موظف",
      durationLabels: { monthly: "شهر واحد", six: "6 أشهر", year: "12 شهراً" },
      bonusLabels: {
        monthly: "بدون أشهر مجانية",
        six: "+ شهر مجاني",
        year: "+ شهران مجاناً",
      },
      saveLabels: { monthly: "السعر الأساسي", six: "وفر 12%", year: "وفر 25%" },
      perEmployee: "/ موظف / شهر",
      oldPrefix: "مقابل $4.00 في الخطة الشهرية",
      totalSuffix: "الإجمالي",
      cta: "جرّب مجاناً",
      note: "عند إضافة موظفين في منتصف المدة، يحسب النظام المبلغ تلقائياً.",
    },
    testimonials: {
      eyebrow: "ماذا يقول المديرون",
      title: "توقفوا عن التخمين. بدأوا المعرفة.",
      items: [
        {
          quote:
            "كنت أجادل حول التأخير كل أسبوع. الآن أفتح التطبيق وأعرض الوقت، وتنتهي المحادثة خلال 30 ثانية.",
          name: "Jessica Park",
          role: "مالكة مطعم، دبي",
        },
        {
          quote:
            "فريقي الميداني يغطي ثلاث مدن. الآن أرى كل تسجيل وكل صورة وكل موقع في الوقت الفعلي.",
          name: "Amir Khalil",
          role: "مدير عمليات، أبوظبي",
        },
        {
          quote:
            "جرّبنا نظام بصمة. تعطل خلال شهرين وكلف إصلاحه $800. HiTeam أقل تكلفة في السنة.",
          name: "Sofia Mendes",
          role: "مديرة صالون، لندن",
        },
      ],
    },
    faq: {
      eyebrow: "الأسئلة الشائعة",
      title: "أسئلة متكررة",
      items: [
        {
          q: "هل نحتاج أجهزة خاصة؟",
          a: "لا. يعمل HiTeam على أي هاتف iOS أو Android.",
        },
        {
          q: "كيف يعمل تحقق الموقع؟",
          a: "يتأكد النظام أن الهاتف داخل منطقة العمل المحددة.",
        },
        {
          q: "كيف يعمل التحقق بالوجه؟",
          a: "يؤكد الموظف هويته داخل التطبيق قبل تسجيل الحضور.",
        },
        {
          q: "هل يمكن تسجيل زميل؟",
          a: "لا. يجب أن يتطابق الوجه والموقع معاً.",
        },
        { q: "ما هي قوائم الصور؟", a: "مهام بدليل صورة ووقت دقيق." },
        {
          q: "ماذا يحدث عند المغادرة المبكرة؟",
          a: "يتم تسجيلها تلقائياً وتظهر كتنبيه.",
        },
        {
          q: "كيف تعمل المكافآت؟",
          a: "يرى المدير الالتزام والمهام المكتملة ثم يكافئ أفضل الموظفين.",
        },
        {
          q: "هل يمكن إرسال إعلانات للفريق؟",
          a: "نعم. أخبار الشركة تصل كإشعارات فورية داخل التطبيق.",
        },
        {
          q: "هل يذكّر HiTeam بأعياد الميلاد؟",
          a: "نعم. تذكيرات أعياد الميلاد مدمجة.",
        },
        {
          q: "ماذا لو كانت إشارة GPS ضعيفة؟",
          a: "يمكن ضبط منطقة عمل عملية ومراجعة التسجيلات بالصور والوقت.",
        },
        {
          q: "كيف تتم الفوترة عند إضافة موظف في منتصف الفترة؟",
          a: "يحسب النظام المبلغ النسبي تلقائياً.",
        },
        {
          q: "هل يوجد استرداد؟",
          a: "المدفوعات نهائية، لذلك توجد تجربة مجانية 7 أيام.",
        },
      ],
    },
    cta: {
      title: "7 أيام مجاناً. الإعداد في يوم واحد.",
      subtitle: "لا عقود. لا أجهزة. لا متخصص تقني.",
      primary: "ابدأ التجربة المجانية",
      secondary: "احجز عرضاً",
      italic: "كل يوم بدون HiTeam هو يوم تدفع فيه مقابل وقت لا تحصل عليه.",
    },
    footer: {
      description:
        "إدارة القوى العاملة للفرق التي تعمل في العالم الحقيقي. بدون أجهزة.",
      product: "المنتج",
      company: "الشركة",
      contacts: "القانوني",
      links: ["كيف يعمل", "المميزات", "الأسعار", "التطبيق"],
      legal: ["الشروط", "الخصوصية", "Cookies"],
      copyright:
        "© 2026 HiTeam · ALT TECHNOLOGIES L.L.C · Dubai, UAE · info@hiteam.net",
    },
    demo: {
      title: "احصل على عرض",
      subtitle: "اترك بياناتك وسنوضح كيف يناسب HiTeam عملك.",
      name: "الاسم",
      email: "البريد الإلكتروني",
      phone: "رقم الهاتف (+...)",
      terms: "أوافق على معالجة البيانات الشخصية وسياسة الخصوصية.",
      button: "طلب عرض",
    },
  },
};

function isLandingLocale(value: string | null): value is LandingLocale {
  return value === "en" || value === "ru" || value === "es" || value === "ar";
}

function resolveBrowserLocale(): LandingLocale {
  if (typeof window === "undefined") {
    return "en";
  }

  const candidates = [
    ...(Array.isArray(window.navigator.languages)
      ? window.navigator.languages
      : []),
    window.navigator.language,
  ]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.toLowerCase());

  if (candidates.some((value) => value === "ru" || value.startsWith("ru-")))
    return "ru";
  if (candidates.some((value) => value === "es" || value.startsWith("es-")))
    return "es";
  if (candidates.some((value) => value === "ar" || value.startsWith("ar-")))
    return "ar";

  return "en";
}

function formatMoney(value: number) {
  return `$${value.toLocaleString("en-US", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  })}`;
}

function FeatureIcon({ name }: { name: FeatureIconName }) {
  const common = {
    className: "h-6 w-6 text-primary",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.9,
    viewBox: "0 0 24 24",
  };

  if (name === "clock") {
    return (
      <svg aria-hidden="true" {...common}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5v5l3.4 2" />
        <path d="M6.8 3.8 4.4 6.2M17.2 3.8l2.4 2.4" />
      </svg>
    );
  }

  if (name === "photo") {
    return (
      <svg aria-hidden="true" {...common}>
        <rect height="14" rx="2.5" width="17" x="3.5" y="5" />
        <circle cx="9" cy="10" r="1.6" />
        <path d="m6.5 17 4.1-4.1 2.9 2.9 1.6-1.6L18 17" />
      </svg>
    );
  }

  if (name === "tasks") {
    return (
      <svg aria-hidden="true" {...common}>
        <path d="m5 7 1.8 1.8L10.5 5" />
        <path d="M13 7h6" />
        <path d="m5 14 1.8 1.8 3.7-3.8" />
        <path d="M13 14h6" />
      </svg>
    );
  }

  if (name === "field") {
    return (
      <svg aria-hidden="true" {...common}>
        <path d="M6.5 18.5c3-5.8 8.1-7.4 11-13" />
        <path d="M7.5 5.5h10v10" />
        <circle cx="6.5" cy="18.5" r="2" />
        <circle cx="17.5" cy="5.5" r="2" />
      </svg>
    );
  }

  if (name === "news") {
    return (
      <svg aria-hidden="true" {...common}>
        <path d="M5 6.5h12.5A1.5 1.5 0 0 1 19 8v10H6.5A1.5 1.5 0 0 1 5 16.5z" />
        <path d="M8 10h7M8 13h7M8 16h4" />
      </svg>
    );
  }

  if (name === "birthday") {
    return (
      <svg aria-hidden="true" {...common}>
        <path d="M7 10h10v9H7z" />
        <path d="M7 14c1.6 1 3.4 1 5 0s3.4-1 5 0" />
        <path d="M9 10V7M12 10V6M15 10V7" />
        <path d="M9 5.2 9.8 4l.8 1.2M12 4.2l.8-1.2.8 1.2M15 5.2l.8-1.2.8 1.2" />
      </svg>
    );
  }

  if (name === "rewards") {
    return (
      <svg aria-hidden="true" {...common}>
        <path d="M8 5h8v4.5a4 4 0 0 1-8 0z" />
        <path d="M8 7H5.5a2.5 2.5 0 0 0 2.8 3.8M16 7h2.5a2.5 2.5 0 0 1-2.8 3.8" />
        <path d="M12 13.5V17M9 19h6" />
      </svg>
    );
  }

  if (name === "schedule") {
    return (
      <svg aria-hidden="true" {...common}>
        <rect height="15" rx="2.5" width="16" x="4" y="5.5" />
        <path d="M8 3.5v4M16 3.5v4M4 10h16" />
        <path d="M8 14h2M12 14h2M16 14h1M8 17h2M12 17h2" />
      </svg>
    );
  }

  if (name === "reports") {
    return (
      <svg aria-hidden="true" {...common}>
        <path d="M5 19V5" />
        <path d="M5 19h15" />
        <rect height="5" rx="1" width="3" x="8" y="12" />
        <rect height="9" rx="1" width="3" x="13" y="8" />
        <rect height="12" rx="1" width="3" x="18" y="5" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" {...common}>
      <path d="M12 3.8 19 6.7v5.1c0 4.3-2.8 7.2-7 8.4-4.2-1.2-7-4.1-7-8.4V6.7z" />
      <path d="m8.7 12.1 2.1 2.1 4.6-4.8" />
    </svg>
  );
}

function CostCardIcon({ index }: { index: number }) {
  if (index === 0) {
    return (
      <svg
        aria-hidden="true"
        className="h-8 w-8"
        fill="none"
        viewBox="0 0 32 32"
      >
        <rect
          fill="#22C55E"
          height="14"
          rx="2"
          transform="rotate(-36 4.5 16.5)"
          width="20"
          x="4.5"
          y="16.5"
        />
        <path
          d="M9 17.2 14.8 21l7.9-6.1"
          stroke="#DCFCE7"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
        />
        <circle cx="15.7" cy="18" fill="#BBF7D0" r="2.7" />
        <path
          d="m21 10 4.2 4.2M25.2 14.2V10M25.2 14.2h-4.3"
          stroke="#60A5FA"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.3"
        />
        <path
          d="M22 17.8v6.4"
          stroke="#FACC15"
          strokeLinecap="round"
          strokeWidth="3"
        />
      </svg>
    );
  }

  if (index === 1) {
    return (
      <svg
        aria-hidden="true"
        className="h-8 w-8"
        fill="none"
        viewBox="0 0 32 32"
      >
        <rect fill="#EDE9FE" height="22" rx="3" width="20" x="6" y="5" />
        <path
          d="M10 9h12"
          stroke="#C4B5FD"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <path
          d="M10 13h9"
          stroke="#C4B5FD"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <path
          d="m10 17 5.2-1.2 4.1 5.8 3.7-2.4"
          stroke="#F43F5E"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
        />
        <path
          d="M22.8 19.2 23 23l-3.5-1.4"
          stroke="#F43F5E"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
        />
      </svg>
    );
  }

  if (index === 2) {
    return (
      <svg
        aria-hidden="true"
        className="h-8 w-8"
        fill="none"
        viewBox="0 0 32 32"
      >
        <path d="M10 5h12v22H10z" fill="#B45309" />
        <path d="M13 7h7v18h-7z" fill="#C9824A" />
        <path d="M22 5h2v22h-2z" fill="#7C2D12" />
        <path
          d="M15 11h4M15 15h4M15 19h4"
          stroke="#FBC88C"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
        <circle cx="20.5" cy="16" fill="#FDE68A" r="1" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="h-8 w-8" fill="none" viewBox="0 0 32 32">
      <path
        d="M8 13h16v13H8z"
        fill="#FACC15"
        stroke="#FACC15"
        strokeLinejoin="round"
      />
      <path d="M15 13h3v13h-3z" fill="#EF4444" />
      <path d="M6.5 10h19v5h-19z" fill="#F97316" />
      <path d="M15 10h3v16h-3z" fill="#EF4444" />
      <path
        d="M16 10c-3.8-.4-6.1-1.8-5.5-3.5.5-1.5 3.2-1.1 5.5 3.5ZM17 10c3.8-.4 6.1-1.8 5.5-3.5-.5-1.5-3.2-1.1-5.5 3.5Z"
        fill="#EF4444"
      />
    </svg>
  );
}

function HowStepIcon({ index }: { index: number }) {
  if (index === 0) {
    return (
      <svg
        aria-hidden="true"
        className="h-8 w-8"
        fill="none"
        viewBox="0 0 32 32"
      >
        <path
          d="M16 4.5c-5 0-9 4-9 9 0 6.4 9 14 9 14s9-7.6 9-14c0-5-4-9-9-9Z"
          fill="#EC4899"
        />
        <path
          d="M10.5 13.2c0-3.1 2.5-5.6 5.6-5.6"
          stroke="#F9A8D4"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <circle cx="16" cy="13.5" fill="#FDE68A" r="2.9" />
        <path
          d="M16 23v5"
          stroke="#94A3B8"
          strokeLinecap="round"
          strokeWidth="2"
        />
      </svg>
    );
  }

  if (index === 1) {
    return (
      <svg
        aria-hidden="true"
        className="h-8 w-8"
        fill="none"
        viewBox="0 0 32 32"
      >
        <rect fill="#334155" height="24" rx="3" width="18" x="7" y="4" />
        <rect fill="#F97316" height="4" rx="1" width="12" x="10" y="7" />
        <path
          d="M11 14h2M16 14h2M21 14h0M11 18h2M16 18h2M21 18h0M11 22h2M16 22h2M21 22h0"
          stroke="#60A5FA"
          strokeLinecap="round"
          strokeWidth="2.2"
        />
        <path
          d="M10 26h12"
          stroke="#A78BFA"
          strokeLinecap="round"
          strokeWidth="2"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="h-8 w-8" fill="none" viewBox="0 0 32 32">
      <rect fill="#4ADE80" height="22" rx="4" width="22" x="5" y="5" />
      <path
        d="m10.5 16.5 4.2 4.1 7.8-9.1"
        stroke="#FFFFFF"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <path
        d="M9 8.5h14"
        stroke="#86EFAC"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function IntegrationIcon({ name }: { name: string }) {
  const isCompact = name === "salon" || name === "diamond" || name === "orb";
  const common = cx(isCompact ? "h-7 w-7" : "h-8 w-8", "shrink-0");
  const strokeProps = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.9,
  };

  if (name === "bars") {
    return (
      <svg
        aria-hidden="true"
        className={cx(common, "text-sky-500")}
        viewBox="0 0 32 32"
      >
        <rect height="23" rx="5" width="23" x="4.5" y="4.5" {...strokeProps} />
        <path d="M10 24V14M16 24V9M22 24v-7" {...strokeProps} />
        <path d="M8 24h17" {...strokeProps} />
      </svg>
    );
  }

  if (name === "plate") {
    return (
      <svg
        aria-hidden="true"
        className={cx(common, "text-violet-500")}
        viewBox="0 0 32 32"
      >
        <circle cx="16" cy="16" r="8" {...strokeProps} />
        <circle cx="16" cy="16" r="3.5" {...strokeProps} />
        <path d="M7.5 8.5v15M10.5 8.5v15M24.5 8.5v15" {...strokeProps} />
        <path d="M24.5 8.5c2 3.4 2 6.9 0 10" {...strokeProps} />
      </svg>
    );
  }

  if (name === "box") {
    return (
      <svg
        aria-hidden="true"
        className={cx(common, "text-amber-600")}
        viewBox="0 0 32 32"
      >
        <path d="m16 4.5 10 5.8v11.4l-10 5.8-10-5.8V10.3z" {...strokeProps} />
        <path d="m6 10.3 10 5.8 10-5.8M16 16.1v11.4" {...strokeProps} />
        <path d="m10.75 7.55 10 5.8" {...strokeProps} />
      </svg>
    );
  }

  if (name === "building") {
    return (
      <svg
        aria-hidden="true"
        className={cx(common, "text-blue-500")}
        viewBox="0 0 32 32"
      >
        <rect height="23" rx="3" width="18" x="7" y="4.5" {...strokeProps} />
        <path d="M11.5 9.5h2.5M18 9.5h2.5M11.5 14.5h2.5M18 14.5h2.5M11.5 19.5h2.5M18 19.5h2.5" {...strokeProps} />
        <path d="M13 27.5v-4h6v4M7 7.5h18" {...strokeProps} />
      </svg>
    );
  }

  if (name === "link") {
    return (
      <svg
        aria-hidden="true"
        className={cx(common, "text-violet-500")}
        viewBox="0 0 32 32"
      >
        <path d="m13.5 20.5-2.25 2.25a5.25 5.25 0 0 1-7.4-7.42l4-4a5.25 5.25 0 0 1 7.4 0" {...strokeProps} />
        <path d="m18.5 11.5 2.25-2.25a5.25 5.25 0 0 1 7.4 7.42l-4 4a5.25 5.25 0 0 1-7.4 0" {...strokeProps} />
        <path d="m12.5 19.5 7-7" {...strokeProps} />
      </svg>
    );
  }

  if (name === "salon") {
    return (
      <svg
        aria-hidden="true"
        className={cx(common, "text-fuchsia-500")}
        viewBox="0 0 32 32"
      >
        <path d="M11 4.5h8l-3.25 8.5H22L10.5 27.5 14 17H8z" {...strokeProps} />
        <path d="M21 6.5h3M20.5 11h3M20 15.5h4" {...strokeProps} />
      </svg>
    );
  }

  if (name === "diamond") {
    return (
      <svg
        aria-hidden="true"
        className={cx(common, "text-sky-500")}
        viewBox="0 0 32 32"
      >
        <path d="m16 4.5 11 11-11 11-11-11z" {...strokeProps} />
        <path d="m16 4.5 4.5 11L16 26.5l-4.5-11z" {...strokeProps} />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className={cx(common, "text-violet-500")}
      viewBox="0 0 32 32"
    >
      <circle cx="16" cy="16" r="10" {...strokeProps} />
      <path d="M9.5 16c3.7-5.2 9.3-5.2 13 0-3.7 5.2-9.3 5.2-13 0Z" {...strokeProps} />
      <path d="M16 13.5v5" {...strokeProps} />
    </svg>
  );
}

function RatingStars() {
  return (
    <div className="flex items-center gap-1" aria-label="5 star rating">
      {Array.from({ length: 5 }).map((_, index) => (
        <svg
          aria-hidden="true"
          className="h-3 w-3 text-[#d97706]"
          fill="currentColor"
          key={index}
          viewBox="0 0 20 20"
        >
          <path d="m10 1.6 2.45 5.2 5.55.85-4 4.04.94 5.7L10 14.72l-4.94 2.67.94-5.7-4-4.04 5.55-.85z" />
        </svg>
      ))}
    </div>
  );
}

function getMockupLocale(locale: LandingLocale) {
  return locale === "ru" ? "ru" : "en";
}

function LightningIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path d="M13.2 2.8 5 13h6.2l-.5 8.2L19 10.6h-6.1z" fill="currentColor" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <rect
        height="10"
        rx="2.2"
        stroke="currentColor"
        strokeWidth="2"
        width="15"
        x="4.5"
        y="10.5"
      />
      <path
        d="M8 10.5V8a4 4 0 0 1 8 0v2.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M12 14.5v2.2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function CaseTabIcon({
  className,
  index,
}: {
  className?: string;
  index: number;
}) {
  const common = cx(
    "h-5 w-5 shrink-0 fill-none stroke-current stroke-[1.8] text-current sm:h-4 sm:w-4",
    className,
  );

  if (index === 0) {
    return (
      <svg aria-hidden="true" className={common} viewBox="0 0 24 24">
        <path d="M4 11a8 8 0 0 1 16 0" stroke="#9CA3AF" strokeLinecap="round" />
        <path
          d="M3 12h18M7 12v7M17 12v7"
          stroke="#A78BFA"
          strokeLinecap="round"
        />
        <path d="M8 19h8" stroke="#64748B" strokeLinecap="round" />
      </svg>
    );
  }

  if (index === 1) {
    return (
      <svg aria-hidden="true" className={common} viewBox="0 0 24 24">
        <path
          d="M6 18 18 6M8 7l2.5 2.5M14 13.5 17 17"
          stroke="#A78BFA"
          strokeLinecap="round"
        />
        <path
          d="m5 6 1.2-2L8 5.3M16 19l1.2-2 1.8 1.3"
          stroke="#F59E0B"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (index === 2) {
    return (
      <svg aria-hidden="true" className={common} viewBox="0 0 24 24">
        <rect height="15" rx="2" stroke="#64748B" width="14" x="5" y="6" />
        <path d="M9 10h1M14 10h1M9 14h1M14 14h1" stroke="#2563EB" />
        <path d="M12 21v-4" stroke="#F59E0B" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className={common} viewBox="0 0 24 24">
      <path d="M7 9h10l1 11H6z" stroke="#2563EB" strokeLinejoin="round" />
      <path d="M9 9a3 3 0 0 1 6 0" stroke="#F59E0B" strokeLinecap="round" />
      <path d="M9 14h6" stroke="#94A3B8" strokeLinecap="round" />
    </svg>
  );
}

function CaseResultIcon({ index }: { index: number }) {
  const common = "mt-0.5 h-4 w-4 shrink-0";
  const strokeProps = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
  };

  if (index === 0) {
    return (
      <svg
        aria-hidden="true"
        className={cx(common, "text-red-500")}
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="13" r="7" {...strokeProps} />
        <path d="M12 9.5v4l2.25 1.35" {...strokeProps} />
        <path d="M7 4.75 4.75 7M17 4.75 19.25 7" {...strokeProps} />
        <path d="M12 3v2" {...strokeProps} />
      </svg>
    );
  }

  if (index === 1) {
    return (
      <svg
        aria-hidden="true"
        className={cx(common, "text-slate-500")}
        viewBox="0 0 24 24"
      >
        <rect height="12" rx="2.25" width="16" x="4" y="7" {...strokeProps} />
        <circle cx="12" cy="13" r="3" {...strokeProps} />
        <path d="M8.5 7 10 5h4l1.5 2" {...strokeProps} />
      </svg>
    );
  }

  if (index === 2) {
    return (
      <svg
        aria-hidden="true"
        className={cx(common, "text-amber-500")}
        viewBox="0 0 24 24"
      >
        <path d="M8 4h8v5.5a4 4 0 0 1-8 0z" {...strokeProps} />
        <path d="M8 6H5.75a2.25 2.25 0 0 0 2.25 3M16 6h2.25A2.25 2.25 0 0 1 16 9" {...strokeProps} />
        <path d="M12 13.5V18M9 20h6" {...strokeProps} />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className={cx(common, "text-pink-500")}
      viewBox="0 0 24 24"
    >
      <path d="M5 10.5v4M9 9.5l9-3v11l-9-3z" {...strokeProps} />
      <path d="m9 14.5 1.5 4" {...strokeProps} />
    </svg>
  );
}

function Reveal({
  amount = 0.2,
  children,
  className,
  delay = 0,
}: {
  amount?: number;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      transition={{ delay, duration: 0.52, ease: "easeOut" }}
      viewport={{ amount, once: true }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
    >
      {children}
    </motion.div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  center = false,
  light = false,
}: {
  eyebrow: string;
  title: string | string[];
  subtitle?: string;
  center?: boolean;
  light?: boolean;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={cx(
        "mb-12 max-w-3xl",
        center ? "mx-auto text-center" : "",
        light ? "text-white" : "text-foreground",
      )}
      data-lp-section-heading
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      transition={{ duration: 0.48, ease: "easeOut" }}
      viewport={{ amount: 0.65, once: true }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
    >
      <span
        className={cx(
          "mb-3 block text-[0.7rem] font-bold tracking-[0.12em] uppercase",
          light ? "text-white/70" : "text-primary",
        )}
      >
        {eyebrow}
      </span>
      <h2 className="text-[clamp(1.75rem,3.5vw,2.625rem)] leading-[1.12] font-extrabold tracking-[-0.02em]">
        {(Array.isArray(title) ? title : [title]).map((line) => (
          <span className="block" key={line}>
            {line}
          </span>
        ))}
      </h2>
      {subtitle ? (
        <p
          className={cx(
            "mt-3 max-w-[32.5rem] text-base leading-7",
            center ? "mx-auto" : "",
            light ? "text-white/72" : "text-muted-foreground",
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </motion.div>
  );
}

function HeroHardwareIcon({
  index,
  className,
}: {
  index: number;
  className?: string;
}) {
  const source =
    index === 0
      ? "https://www.svgrepo.com/show/478933/fingerprint.svg"
      : index === 1
        ? "https://www.svgrepo.com/show/175836/access-card.svg"
        : "https://www.svgrepo.com/show/305903/contactlesspayment.svg";

  return (
    <img
      alt=""
      aria-hidden="true"
      className={cx(className, index === 0 && "scale-80")}
      draggable={false}
      src={source}
    />
  );
}

function HeroSmartphoneIcon({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span className={cx("relative inline-block", className)}>
      <svg
        aria-hidden="true"
        className="h-full w-full"
        fill="none"
        viewBox="0 0 48 48"
      >
        <rect fill="#24418F" height="38" rx="5" width="28" x="10" y="5" />
        <rect fill="#172554" height="31" rx="3" width="22" x="13" y="9" />
        <rect fill="#F97316" height="5" rx="1" width="5" x="16" y="13" />
        <rect fill="#FACC15" height="5" rx="1" width="5" x="24" y="13" />
        <rect fill="#A78BFA" height="5" rx="1" width="5" x="16" y="22" />
        <rect fill="#60A5FA" height="5" rx="1" width="5" x="24" y="22" />
        <rect fill="#F472B6" height="5" rx="1" width="5" x="16" y="31" />
        <rect fill="#22C55E" height="5" rx="1" width="5" x="24" y="31" />
      </svg>
      <span
        className={cx(
          "absolute grid place-items-center rounded-full bg-emerald-600 font-black text-white",
          compact
            ? "-top-1 right-0 h-4 min-w-4 px-1 text-[0.5rem]"
            : "-top-1.5 -right-2 h-5 min-w-6 px-1.5 text-[0.62rem]",
        )}
      >
        ✓
      </span>
    </span>
  );
}

function HeroCrossStrikeIcon({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={cx(
        "pointer-events-none absolute grid place-items-center rounded-full bg-red-600 text-white",
        compact
          ? "-top-1 right-0 h-4 min-w-4 px-1"
          : "-top-1.5 -right-2 h-5 min-w-6 px-1.5",
      )}
    >
      <svg
        aria-hidden="true"
        className={compact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"}
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          d="M20 20 4 4M20 4 4 20"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2.5"
        />
      </svg>
    </span>
  );
}

function HeroMiniIcon({
  name,
}: {
  name:
    | "location"
    | "face"
    | "tasks"
    | "reward"
    | "news"
    | "phone"
    | "camera"
    | "checklist";
}) {
  const common =
    "h-3.5 w-3.5 shrink-0 fill-none stroke-current stroke-[2] stroke-linecap-round stroke-linejoin-round";

  if (name === "location") {
    return (
      <svg aria-hidden="true" className={common} viewBox="0 0 24 24">
        <path d="M12 21s7-5.4 7-12a7 7 0 1 0-14 0c0 6.6 7 12 7 12Z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    );
  }

  if (name === "face") {
    return (
      <svg aria-hidden="true" className={common} viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="3" />
        <path d="M6 20c1.1-3.5 3.1-5.2 6-5.2s4.9 1.7 6 5.2" />
      </svg>
    );
  }

  if (name === "tasks" || name === "checklist") {
    return (
      <svg aria-hidden="true" className={common} viewBox="0 0 24 24">
        <path d="M8 6h11M8 12h11M8 18h7" />
        <path d="m3.8 6 1 1 2-2M3.8 12l1 1 2-2M3.8 18l1 1 2-2" />
      </svg>
    );
  }

  if (name === "reward") {
    return (
      <svg aria-hidden="true" className={common} viewBox="0 0 24 24">
        <path d="M8 5h8v5a4 4 0 0 1-8 0z" />
        <path d="M8 7H5.5a2 2 0 0 0 2.2 3M16 7h2.5a2 2 0 0 1-2.2 3" />
        <path d="M12 14v4M9 20h6" />
      </svg>
    );
  }

  if (name === "news") {
    return (
      <svg aria-hidden="true" className={common} viewBox="0 0 24 24">
        <path d="M5 9v6M9 8l8-3v14l-8-3z" />
        <path d="m9 16 1.5 4" />
      </svg>
    );
  }

  if (name === "camera") {
    return (
      <svg aria-hidden="true" className={common} viewBox="0 0 24 24">
        <rect height="13" rx="2" width="18" x="3" y="7" />
        <path d="m8 7 1.5-3h5L16 7" />
        <circle cx="12" cy="13.5" r="3" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className={common} viewBox="0 0 24 24">
      <rect height="18" rx="3" width="11" x="6.5" y="3" />
      <path d="M10 18h4" />
    </svg>
  );
}

function HeroHardwareMark({
  index,
  name,
  compact = false,
  smartphone = false,
}: {
  index: number;
  name: string;
  compact?: boolean;
  smartphone?: boolean;
}) {
  const labelParts = name.split(/\s+/).filter(Boolean);

  return (
    <div
      className={cx(
        "flex min-w-0 flex-col items-center text-center",
        compact ? "w-full gap-[3px]" : "gap-1",
      )}
    >
      {smartphone ? (
        <HeroSmartphoneIcon
          className={compact ? "h-[32px] w-[32px]" : "h-12 w-12"}
          compact={compact}
        />
      ) : (
        <div className="relative">
          <HeroHardwareIcon
            className={
              compact
                ? "h-[28px] w-[28px]"
                : "h-[42px] w-[42px]"
            }
            index={index}
          />
          <HeroCrossStrikeIcon compact={compact} />
        </div>
      )}
      <p
        className={cx(
          "text-[0.56rem] leading-tight font-bold tracking-[0.04em] uppercase",
          compact
            ? "max-w-full text-[0.47rem] tracking-[0.02em]"
            : "max-w-[5.9rem]",
          smartphone ? "text-emerald-600" : "text-red-600",
        )}
      >
        {labelParts.map((part, partIndex) => (
          <span className="block" key={`${name}-${part}-${partIndex}`}>
            {part}
          </span>
        ))}
      </p>
    </div>
  );
}

function HeroRightHardware({
  compact = false,
  copy,
}: {
  compact?: boolean;
  copy: Copy;
}) {
  const rightSmartphoneLabel =
    copy.hero.smartphoneLabel.toLowerCase() === "smartphone"
      ? "Any smartphone"
      : copy.hero.smartphoneLabel;
  const pills = [
    { icon: "location" as const, label: "Geolocation", tone: "blue" },
    { icon: "face" as const, label: "Face verify", tone: "blue" },
    { icon: "tasks" as const, label: "Photo tasks", tone: "green" },
    { icon: "reward" as const, label: "Rewards", tone: "green" },
    { icon: "news" as const, label: "News", tone: "green" },
  ];

  if (compact) {
    return (
      <div className="mb-0 w-full max-w-full">
        <div className="mb-3 flex min-w-0 items-center gap-2 text-[0.68rem] font-semibold tracking-[0.1em] text-red-600 uppercase">
          <span className="h-0.5 w-3.5 shrink-0 bg-red-600" />
          <span className="min-w-0 break-words">
            {copy.hero.hardwareLabel}
          </span>
        </div>
        <div className="mb-4 grid w-full min-w-0 grid-cols-4 gap-1.5">
          {copy.hero.hardware.map((item, index) => (
            <HeroHardwareMark
              compact
              index={index}
              key={item.name}
              name={item.name}
            />
          ))}
          <HeroHardwareMark
            compact
            index={3}
            name={rightSmartphoneLabel}
            smartphone
          />
        </div>
        <div className="grid w-full min-w-0 grid-cols-2 gap-[5px] min-[390px]:flex min-[390px]:flex-wrap min-[390px]:justify-center">
          {pills
            .filter((pill) => pill.icon !== "news")
            .map((pill) => (
              <span
                className={cx(
                  "inline-flex min-w-0 items-center justify-center gap-1 rounded-full px-[9px] py-[3px] text-[0.58rem] font-bold",
                  pill.tone === "blue"
                    ? "bg-blue-50 text-[#1e3a8a]"
                    : "bg-emerald-50 text-emerald-600",
                )}
                key={pill.label}
              >
                <HeroMiniIcon name={pill.icon} />
                <span className="min-w-0 truncate">{pill.label}</span>
              </span>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-5 max-w-full">
      <div className="mb-3 flex items-center gap-2 text-[0.68rem] font-semibold tracking-[0.1em] text-red-600 uppercase">
        <span className="h-0.5 w-3.5 bg-red-600" />
        {copy.hero.hardwareLabel}
      </div>
      <div
        className="mb-4 flex flex-wrap items-start gap-3"
      >
        {copy.hero.hardware.map((item, index) => (
          <Fragment key={item.name}>
            <HeroHardwareMark compact={compact} index={index} name={item.name} />
            {index < copy.hero.hardware.length - 1 ? (
              <span
                className="pt-3 text-lg text-slate-300"
              >
                +
              </span>
            ) : null}
          </Fragment>
        ))}
        <span
          className="pt-3 text-2xl font-light text-slate-400"
        >
          →
        </span>
        <HeroHardwareMark
          compact={compact}
          index={3}
          name={rightSmartphoneLabel}
          smartphone
        />
      </div>
      <div
        className="flex max-w-full flex-wrap gap-[5px]"
      >
        {pills.map((pill) => (
          <span
            className={cx(
              "inline-flex items-center gap-1 rounded-full px-[11px] py-[3px] text-[0.62rem] font-bold",
              pill.tone === "blue"
                ? "bg-blue-50 text-[#1e3a8a]"
                : "bg-emerald-50 text-emerald-600",
            )}
            key={pill.label}
          >
            <HeroMiniIcon name={pill.icon} />
            {pill.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function CheckLine({
  children,
  light = false,
  variant = "neutral",
}: {
  children: React.ReactNode;
  light?: boolean;
  variant?: "neutral" | "bad" | "good";
}) {
  const icon =
    variant === "bad" ? (
      <svg
        aria-hidden="true"
        className="h-4 w-4 text-red-600"
        fill="none"
        viewBox="0 0 16 16"
      >
        <path
          d="M4 4l8 8M12 4l-8 8"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
        />
      </svg>
    ) : variant === "good" ? (
      <svg
        aria-hidden="true"
        className="h-4 w-4 text-emerald-600"
        fill="none"
        viewBox="0 0 16 16"
      >
        <path
          d="M3.5 8.5l3 3 6-7"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    ) : (
      <span
        className={cx(
          "h-2 w-2 rounded-full",
          light ? "bg-white" : "bg-primary",
        )}
      />
    );

  return (
    <li
      className={cx(
        "flex items-start gap-3 text-sm leading-6",
        light ? "text-white/78" : "text-slate-700",
      )}
    >
      <span className="mt-1 grid h-4 w-4 shrink-0 place-items-center">
        {icon}
      </span>
      <span>{children}</span>
    </li>
  );
}

function FlagIcon({ locale }: { locale: LandingLocale }) {
  const className =
    "block h-[22px] w-[31px] overflow-hidden rounded-[8px] border border-slate-300/80";

  if (locale === "en") {
    return (
      <svg
        aria-hidden="true"
        className={className}
        viewBox="0 0 60 40"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect fill="#012169" height="40" width="60" />
        <path d="M0 0 60 40M60 0 0 40" stroke="#fff" strokeWidth="8" />
        <path d="M0 0 60 40M60 0 0 40" stroke="#C8102E" strokeWidth="4" />
        <path d="M30 0v40M0 20h60" stroke="#fff" strokeWidth="13" />
        <path d="M30 0v40M0 20h60" stroke="#C8102E" strokeWidth="8" />
      </svg>
    );
  }

  if (locale === "ru") {
    return (
      <svg
        aria-hidden="true"
        className={className}
        viewBox="0 0 60 40"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect fill="#fff" height="40" rx="3" width="60" />
        <path d="M0 13.33h60v13.34H0z" fill="#1C57A5" />
        <path d="M0 26.67h60V40H0z" fill="#D52B1E" />
      </svg>
    );
  }

  if (locale === "es") {
    return (
      <svg
        aria-hidden="true"
        className={className}
        viewBox="0 0 60 40"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect fill="#AA151B" height="40" rx="3" width="60" />
        <path d="M0 10h60v20H0z" fill="#F1BF00" />
        <rect fill="#C60B1E" height="9" rx="1" width="6" x="14" y="15.5" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 60 40"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#006C35" height="40" rx="3" width="60" />
      <path
        d="M17 15.2h26M19 18h22M20 20.8h20"
        stroke="#fff"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M16 28h25c2.8 0 4.8-.7 6-2.2"
        stroke="#fff"
        strokeLinecap="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}

function HeroPhoneCard({ copy }: { copy: Copy }) {
  const attendanceRows = [
    {
      name: "Lena Kovač",
      gender: "female",
      value: "",
      badge: "Not checked in",
      tone: "muted",
    },
    {
      name: "Ahmed Al Rashid",
      gender: "male",
      value: "09:18",
      badge: "Late by 18 min",
      tone: "late",
    },
    {
      name: "Sofia Mendes",
      gender: "female",
      value: "08:59",
      badge: "On time",
      tone: "ok",
    },
    {
      name: "Amir Khalil",
      gender: "male",
      value: "09:01",
      badge: "On time",
      tone: "ok",
    },
  ] as const;

  return (
    <div className="mx-auto w-full max-w-[33rem] lg:ml-0">
      <HeroRightHardware copy={copy} />

      <div className="space-y-1">
        {attendanceRows.map((row) => (
          <div
            className="flex items-center gap-2 rounded-[7px] px-2 py-1.5 transition hover:bg-[#f8faff]"
            key={row.name}
          >
            <img
              alt={row.name}
              className="h-[26px] w-[26px] shrink-0 rounded-full object-cover ring-1 ring-black/10"
              src={getMockAvatarDataUrl(row.name, row.gender)}
            />
            <span className="min-w-0 flex-1 text-[0.68rem] font-semibold text-slate-950">
              {row.name}
            </span>
            <span className="text-right">
              {row.value ? (
                <span
                  className={cx(
                    "block text-[0.62rem] font-extrabold tabular-nums",
                    row.tone === "ok" && "text-emerald-600",
                    row.tone === "late" && "text-red-600",
                  )}
                >
                  {row.value}
                </span>
              ) : null}
              <span
                className={cx(
                  "mt-px block text-[0.5rem] font-bold",
                  row.tone === "ok" && "text-emerald-600",
                  row.tone === "late" && "text-red-600",
                  row.tone === "muted" && "text-slate-500",
                )}
              >
                {row.badge}
              </span>
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="inline-flex items-center gap-1.5 text-[0.62rem] font-bold text-primary">
            <HeroMiniIcon name="checklist" />
            {copy.phone.checklistTitle}
          </p>
          <p className="text-[0.56rem] font-bold text-emerald-600">
            {copy.phone.checklistProgress} ✓
          </p>
        </div>
        <div className="space-y-1">
          {copy.phone.rows.map((row) => (
            <div
              className="flex items-center gap-2 text-[0.62rem] text-slate-700"
              key={row.text}
            >
              <span
                className={cx(
                  "grid h-3 w-3 shrink-0 place-items-center rounded-full",
                  row.done
                    ? "bg-emerald-600"
                    : "border border-slate-300",
                )}
              >
                {row.done ? (
                  <svg
                    aria-hidden="true"
                    className="h-2 w-2 text-white"
                    fill="none"
                    viewBox="0 0 12 12"
                  >
                    <path
                      d="m3 6.2 2 2 4-4.4"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                ) : null}
              </span>
              <span
                className={cx(
                  "min-w-0 flex-1",
                  !row.done && "text-muted-foreground",
                )}
              >
                {row.text}
              </span>
              {row.photo ? (
                <span className="ml-auto text-slate-500">
                  <HeroMiniIcon name="camera" />
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export function SalesLandingPage() {
  const { locale: appLocale, setLocale: setAppLocale } = useI18n();
  const reduceMotion = useReducedMotion();
  const [locale, setLandingLocale] = useState<LandingLocale>(appLocale);
  const [activeCase, setActiveCase] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [employeeCount, setEmployeeCount] = useState(20);
  const [durationKey, setDurationKey] = useState<PricingDurationKey>("six");
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [isHeaderSolid, setIsHeaderSolid] = useState(false);
  const [isLocaleMenuOpen, setIsLocaleMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [demoName, setDemoName] = useState("");
  const [demoEmail, setDemoEmail] = useState("");
  const [demoPhone, setDemoPhone] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    const storedLocale = readBrowserStorageItem(LANDING_LOCALE_STORAGE_KEY);
    setLandingLocale(
      isLandingLocale(storedLocale) ? storedLocale : resolveBrowserLocale(),
    );
  }, []);

  useEffect(() => {
    const updateHeader = () => setIsHeaderSolid(window.scrollY > 16);

    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });

    return () => window.removeEventListener("scroll", updateHeader);
  }, []);

  const copy = COPY[locale];
  const pricing = PRICING_DURATIONS[durationKey];
  const accessMonths = pricing.months + pricing.bonusMonths;
  const total = employeeCount * pricing.unitPrice * pricing.months;
  const activeCaseItem = copy.cases.items[activeCase] ?? copy.cases.items[0];
  const mockupLocale = getMockupLocale(locale);
  const isRtl = copy.dir === "rtl";
  const isDemoValid = Boolean(
    termsAccepted &&
    demoName.trim().length > 0 &&
    (demoEmail.trim().length > 0 || demoPhone.trim().length > 0),
  );

  const totalText = useMemo(() => {
    if (locale === "ru")
      return `${formatMoney(total)} ${copy.pricing.totalSuffix} · доступ ${accessMonths} мес.`;
    if (locale === "es")
      return `${formatMoney(total)} ${copy.pricing.totalSuffix} · ${accessMonths} meses de acceso`;
    if (locale === "ar")
      return `${formatMoney(total)} ${copy.pricing.totalSuffix} · وصول ${accessMonths} شهر`;
    return `${formatMoney(total)} ${copy.pricing.totalSuffix} · ${accessMonths} months of access`;
  }, [accessMonths, copy.pricing.totalSuffix, locale, total]);

  const updateLocale = (nextLocale: LandingLocale) => {
    setLandingLocale(nextLocale);
    setIsLocaleMenuOpen(false);
    setIsMobileMenuOpen(false);
    writeBrowserStorageItem(LANDING_LOCALE_STORAGE_KEY, nextLocale);

    if (nextLocale === "en" || nextLocale === "ru") {
      setAppLocale(nextLocale);
    }
  };

  const scrollTo = (id: string) => {
    setIsMobileMenuOpen(false);
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const headerNavItems = [
    ["how", copy.nav.how],
    ["cases", copy.nav.cases],
    ["pricing", copy.nav.pricing],
    ["questions", copy.nav.faq],
  ] as const;
  const footerLegalHrefs =
    locale === "ru"
      ? ["/terms", "/privacy", "/cookies"]
      : ["/terms-en", "/privacy-en", "/cookies"];

  return (
    <div
      className="landing-shell min-h-screen w-full max-w-[100svw] overflow-x-clip bg-white text-foreground"
      dir={copy.dir}
      lang={locale}
    >
      <header
        className={cx(
          "fixed inset-x-0 top-0 z-50 px-4 transition-all duration-300 sm:px-6 md:px-12",
          isHeaderSolid
            ? "border-b border-slate-200 bg-white/95 shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="mx-auto flex h-[62px] w-full max-w-[1120px] min-w-0 items-center justify-between gap-3">
          <button
            className="flex min-w-0 items-center"
            onClick={() => scrollTo("hero")}
            type="button"
          >
            <BrandWordmark className="text-[1.45rem] text-slate-950 sm:text-[1.9rem]" />
          </button>

          <nav className="hidden items-center gap-7 md:flex">
            {headerNavItems.map(([id, label]) => (
              <button
                className={cx(
                  "text-sm font-medium transition hover:text-primary",
                  isHeaderSolid ? "text-slate-700" : "text-slate-900",
                )}
                key={id}
                onClick={() => scrollTo(id)}
                type="button"
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-5 md:flex">
            <div
              className="relative flex items-center"
              onBlur={(event) => {
                const nextTarget = event.relatedTarget;

                if (
                  !(nextTarget instanceof Node) ||
                  !event.currentTarget.contains(nextTarget)
                ) {
                  setIsLocaleMenuOpen(false);
                }
              }}
            >
              <button
                aria-expanded={isLocaleMenuOpen}
                aria-label={`${copy.languageLabel}: ${LANGUAGE_NAMES[locale]}`}
                className="p-0 leading-none transition hover:scale-105 hover:opacity-80"
                onClick={() => setIsLocaleMenuOpen((value) => !value)}
                type="button"
              >
                <FlagIcon locale={locale} />
              </button>
              <AnimatePresence initial={false}>
                {isLocaleMenuOpen ? (
                  <motion.div
                    animate={
                      reduceMotion
                        ? { opacity: 1 }
                        : { opacity: 1, scale: 1, y: 0 }
                    }
                    className="absolute top-full left-1/2 mt-3 grid gap-2 rounded-[10px] border border-slate-200 bg-white p-2 shadow-[0_16px_44px_rgba(15,23,42,0.14)]"
                    exit={
                      reduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, scale: 0.96, y: -4 }
                    }
                    initial={
                      reduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, scale: 0.96, y: -4 }
                    }
                    style={{ x: "-50%" }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                  >
                    {LANDING_LOCALE_OPTIONS.map((option, optionIndex) => (
                      <motion.button
                        animate={
                          reduceMotion
                            ? { opacity: option === locale ? 1 : 0.65 }
                            : {
                                opacity: option === locale ? 1 : 0.65,
                                scale: 1,
                              }
                        }
                        aria-label={LANGUAGE_NAMES[option]}
                        className="p-0 leading-none"
                        initial={
                          reduceMotion
                            ? false
                            : { opacity: 0, scale: 0.92 }
                        }
                        key={option}
                        onClick={() => updateLocale(option)}
                        transition={{
                          delay: optionIndex * 0.025,
                          duration: 0.16,
                          ease: "easeOut",
                        }}
                        type="button"
                        whileHover={reduceMotion ? undefined : { scale: 1.05 }}
                      >
                        <FlagIcon locale={option} />
                      </motion.button>
                    ))}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
            <a
              className={cx(
                "hidden text-sm font-medium transition hover:text-primary lg:inline",
                isHeaderSolid ? "text-slate-700" : "text-slate-900",
              )}
              href="/login"
            >
              {copy.nav.signIn}
            </a>
            <Button
              asChild
              className="rounded-[8px] px-4 !text-white hover:!text-white"
            >
              <a href="/login">{copy.nav.start}</a>
            </Button>
          </div>
          <button
            aria-expanded={isMobileMenuOpen}
            aria-label="Open menu"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] border border-slate-200 bg-white/90 text-slate-950 shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition hover:border-primary md:hidden"
            onClick={() => setIsMobileMenuOpen((value) => !value)}
            type="button"
          >
            <span className="relative block h-4 w-5">
              <span
                className={cx(
                  "absolute top-0 left-0 h-0.5 w-5 rounded-full bg-current transition-transform",
                  isMobileMenuOpen && "translate-y-[7px] rotate-45",
                )}
              />
              <span
                className={cx(
                  "absolute top-[7px] left-0 h-0.5 w-5 rounded-full bg-current transition-opacity",
                  isMobileMenuOpen && "opacity-0",
                )}
              />
              <span
                className={cx(
                  "absolute bottom-0 left-0 h-0.5 w-5 rounded-full bg-current transition-transform",
                  isMobileMenuOpen && "-translate-y-[7px] -rotate-45",
                )}
              />
            </span>
          </button>
        </div>
      </header>

      <AnimatePresence initial={false}>
        {isMobileMenuOpen ? (
          <motion.div
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            className="fixed inset-x-0 top-[62px] z-40 px-4 md:hidden"
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -14 }}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -14 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <div className="rounded-b-[18px] border border-slate-200 bg-white/96 p-4 shadow-[0_22px_60px_rgba(15,23,42,0.16)] backdrop-blur-xl">
              <div className="grid gap-1">
                {headerNavItems.map(([id, label]) => (
                  <button
                    className="rounded-[10px] px-3 py-3 text-left text-sm font-semibold text-slate-900 transition hover:bg-[#f8faff] hover:text-primary"
                    key={id}
                    onClick={() => scrollTo(id)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-4">
                <span className="text-xs font-bold tracking-[0.12em] text-slate-500 uppercase">
                  {copy.languageLabel}
                </span>
                <div className="flex items-center gap-2">
                  {LANDING_LOCALE_OPTIONS.map((option) => (
                    <button
                      aria-label={LANGUAGE_NAMES[option]}
                      className={cx(
                        "leading-none transition",
                        option === locale ? "opacity-100" : "opacity-55",
                      )}
                      key={option}
                      onClick={() => updateLocale(option)}
                      type="button"
                    >
                      <FlagIcon locale={option} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                <a
                  className="flex h-11 items-center justify-center rounded-[9px] border border-slate-200 text-sm font-semibold text-slate-950"
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {copy.nav.signIn}
                </a>
                <Button
                  asChild
                  className="h-11 rounded-[9px] text-sm font-bold !text-white hover:!text-white"
                >
                  <a href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    {copy.nav.start}
                  </a>
                </Button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <main className="w-full max-w-full overflow-x-clip">
        <section
          className="relative overflow-hidden border-b border-slate-200 px-4 pt-[106px] pb-14 sm:px-6 md:px-12 md:pt-[138px] md:pb-[76px]"
          id="hero"
        >
          <video
            aria-hidden="true"
            autoPlay
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            loop
            muted
            playsInline
            style={{ transform: "scaleX(-1) rotate(180deg)" }}
          >
            <source src="/hero.webm" type="video/webm" />
          </video>
          <div className="absolute inset-0 bg-white/80" />
          <div className="relative z-10 mx-auto grid w-full max-w-[1120px] min-w-0 items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <motion.div
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              className={cx("min-w-0", isRtl ? "text-right" : "")}
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              transition={{ duration: 0.58, ease: "easeOut" }}
            >
              <h1 className="mb-4 w-full max-w-[17ch] text-[clamp(2.15rem,9vw,3.5rem)] leading-[1.08] font-bold tracking-[-0.025em] text-slate-950">
                {copy.hero.titleLines.map((line, index) => (
                  <span
                    className={cx(
                      "block",
                      index === copy.hero.highlightIndex && "text-primary",
                    )}
                    key={`${line}-${index}`}
                  >
                    {line}
                  </span>
                ))}
              </h1>
              <p className="w-full max-w-[27.5rem] text-base leading-7 break-words text-slate-700 [overflow-wrap:anywhere]">
                {copy.hero.subtitle}
              </p>
              <div className="mt-1 flex w-full max-w-full items-start gap-2 text-sm font-bold text-emerald-700">
                <svg
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0"
                  fill="none"
                  viewBox="0 0 16 16"
                >
                  <path
                    d="m3.5 8.4 2.8 2.8 6.2-6.5"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span className="min-w-0 flex-1 leading-6 break-words [overflow-wrap:anywhere]">
                  {copy.hero.verified}
                </span>
              </div>
              <div className="mt-2 flex w-full max-w-full items-start gap-2 text-sm font-semibold text-primary">
                <HeroMiniIcon name="phone" />
                <span className="min-w-0 flex-1 leading-6 break-words [overflow-wrap:anywhere]">
                  {copy.hero.mobile}
                </span>
              </div>

              <div className="mt-7 grid w-full max-w-full gap-3 sm:flex sm:flex-row">
                <Button
                  className="h-12 w-full min-w-0 rounded-[9px] border border-slate-200 bg-white px-5 text-sm font-medium text-slate-950 hover:border-primary hover:bg-white hover:text-primary sm:w-auto"
                  onClick={() => scrollTo("how")}
                  type="button"
                  variant="outline"
                >
                  {copy.hero.secondaryCta}
                </Button>
                <Button
                  asChild
                  className="h-12 w-full min-w-0 rounded-[9px] px-6 text-sm font-bold !text-white hover:!text-white sm:w-auto"
                >
                  <a href="/login">{copy.hero.primaryCta}</a>
                </Button>
              </div>

              <div className="mt-8 w-full max-w-full overflow-hidden lg:hidden">
                <HeroRightHardware compact copy={copy} />
              </div>

              <div className="mt-10 grid w-full max-w-[34rem] min-w-0 grid-cols-3 overflow-hidden rounded-[12px] border border-slate-200 bg-white">
                {copy.hero.stats.map((stat, index) => (
                  <div
                    className={cx(
                      "px-3 py-3 text-center",
                      index > 0 && "border-l border-slate-200",
                    )}
                    key={stat.label}
                  >
                    <p className="text-[1.375rem] font-extrabold tracking-[-0.02em] text-[#1e3a8a] tabular-nums">
                      {stat.value}
                    </p>
                    <p className="mt-0.5 text-[0.68rem] font-medium text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              className="hidden lg:block"
              initial={reduceMotion ? false : { opacity: 0, y: 24 }}
              transition={{ delay: 0.12, duration: 0.58, ease: "easeOut" }}
            >
              <HeroPhoneCard copy={copy} />
            </motion.div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-[#f8faff] px-6 py-6 md:px-12">
          <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-x-8 gap-y-4">
            <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              {copy.logos.label}
            </p>
            <div className="h-5 w-px bg-slate-200" />
            <div className="flex flex-wrap items-center gap-x-9 gap-y-3">
              {copy.logos.names.map((name) => (
                <span
                  className="text-sm font-medium tracking-[0.12em] text-slate-400 transition hover:text-slate-600"
                  key={name}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#1e3a8a] px-6 py-5 text-white md:px-12">
          <div className="mx-auto flex max-w-[1120px] flex-col items-start justify-between gap-5 md:flex-row md:items-center">
            <div>
              <p className="text-base font-semibold">{copy.appStrip.title}</p>
              <p className="mt-1 text-sm text-white/62">
                {copy.appStrip.subtitle}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <AppStoreButton
                className="shrink-0 shadow-[0_14px_34px_rgba(15,23,42,0.22)] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 active:scale-[0.96]"
                href={IOS_APP_URL}
                rel="noreferrer"
                size="md"
                target="_blank"
              />
              <GooglePlayButton
                className="shrink-0 shadow-[0_14px_34px_rgba(15,23,42,0.22)] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 active:scale-[0.96]"
                href={ANDROID_APP_URL}
                rel="noreferrer"
                size="md"
                target="_blank"
              />
            </div>
          </div>
        </section>

        <section className="bg-white px-6 py-20 md:px-12 md:py-[88px]">
          <div className="mx-auto max-w-[1120px]">
            <SectionHeading
              eyebrow={copy.cost.eyebrow}
              title={copy.cost.title}
              subtitle={copy.cost.subtitle}
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {copy.cost.cards.map((card, index) => (
                <motion.article
                  className="rounded-[14px] bg-[#1e3a8a] px-5 py-6 text-white"
                  initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                  key={card.title}
                  transition={{
                    delay: index * 0.045,
                    duration: 0.42,
                    ease: "easeOut",
                  }}
                  viewport={{ amount: 0.35, once: true }}
                  whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                >
                  <div className="mb-4">
                    <CostCardIcon index={index} />
                  </div>
                  <h3 className="text-sm font-bold leading-snug">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-xs leading-6 text-white/62">
                    {card.body}
                  </p>
                </motion.article>
              ))}
            </div>
            <p className="mt-6 flex max-w-full items-start gap-3 text-sm font-medium leading-6 text-amber-800 md:whitespace-nowrap">
              <LightningIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <span className="min-w-0 break-words">{copy.cost.note}</span>
            </p>
          </div>
        </section>

        <section
          className="px-6 py-20 md:px-12 md:py-[88px]"
          style={{
            background: "linear-gradient(180deg, #f5f7fc 0%, #eef3fb 100%)",
          }}
        >
          <div className="mx-auto max-w-[1120px]">
            <SectionHeading
              eyebrow={copy.problem.eyebrow}
              title={copy.problem.title}
              subtitle={copy.problem.subtitle}
            />
            <div className="grid overflow-hidden rounded-[14px] border border-slate-200 bg-slate-200 md:grid-cols-3">
              {copy.problem.cards.map((card, index) => (
                <motion.article
                  className="bg-white px-6 py-7 transition hover:bg-[#f8faff]"
                  initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                  key={card.title}
                  transition={{
                    delay: index * 0.05,
                    duration: 0.42,
                    ease: "easeOut",
                  }}
                  viewport={{ amount: 0.35, once: true }}
                  whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                >
                  <p className="text-[2.5rem] leading-none font-extrabold tracking-[-0.04em] text-blue-100">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-4 text-sm font-bold leading-snug">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {card.body}
                  </p>
                </motion.article>
              ))}
            </div>
            <div className="mt-5 grid overflow-hidden rounded-[14px] border border-slate-200 bg-slate-200 md:grid-cols-2">
              <div className="bg-red-50 px-7 py-6">
                <p className="mb-5 text-xs font-bold tracking-[0.16em] text-red-500 uppercase">
                  {copy.problem.beforeTitle}
                </p>
                <ul className="space-y-3">
                  {copy.problem.before.map((item) => (
                    <CheckLine key={item} variant="bad">
                      {item}
                    </CheckLine>
                  ))}
                </ul>
              </div>
              <div className="bg-emerald-50 px-7 py-6">
                <p className="mb-5 text-xs font-bold tracking-[0.16em] text-emerald-600 uppercase">
                  {copy.problem.afterTitle}
                </p>
                <ul className="space-y-3">
                  {copy.problem.after.map((item) => (
                    <CheckLine key={item} variant="good">
                      {item}
                    </CheckLine>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white px-6 py-20 md:px-12 md:py-[88px]" id="how">
          <div className="mx-auto max-w-[1120px]">
            <SectionHeading
              eyebrow={copy.how.eyebrow}
              title={copy.how.title}
              subtitle={copy.how.subtitle}
            />
            <div className="relative grid gap-10 md:grid-cols-3 md:gap-11">
              <div className="absolute top-[3.65rem] right-[calc(16.67%+1.25rem)] left-[calc(16.67%+1.25rem)] hidden h-px bg-gradient-to-r from-blue-100 via-primary to-blue-100 md:block" />
              {copy.how.steps.map((step, index) => (
                <motion.article
                  className="relative text-center"
                  initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                  key={step.title}
                  transition={{
                    delay: index * 0.08,
                    duration: 0.45,
                    ease: "easeOut",
                  }}
                  viewport={{ amount: 0.45, once: true }}
                  whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                >
                  <div className="relative mb-5 h-[5.25rem]">
                    <p className="absolute top-0 left-1/2 -translate-x-1/2 text-[2.75rem] leading-none font-extrabold tracking-[-0.04em] text-blue-100">
                      {step.icon}
                    </p>
                    <div className="absolute top-[3.65rem] left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
                      <HowStepIcon index={index} />
                    </div>
                  </div>
                  <h3 className="text-sm font-bold">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-7 text-muted-foreground">
                    {step.body}
                  </p>
                </motion.article>
              ))}
            </div>
            <div className="mx-auto mt-8 flex max-w-full items-start gap-3 text-[0.8125rem] leading-7 text-slate-700 md:max-w-none">
              <LockIcon className="mt-1 h-5 w-5 shrink-0 text-primary" />
              <p className="min-w-0 break-words md:whitespace-nowrap">
                {copy.how.proof}
              </p>
            </div>
          </div>
        </section>

        <section
          className="px-6 py-20 md:px-12 md:py-[88px]"
          id="cases"
          style={{
            background: "linear-gradient(180deg, #f5f7fc 0%, #eef3fb 100%)",
          }}
        >
          <div className="mx-auto max-w-[1120px]">
            <SectionHeading
              eyebrow={copy.cases.eyebrow}
              title={copy.cases.title}
              subtitle={copy.cases.subtitle}
            />
            <div className="mb-7 w-full sm:w-fit">
              <div className="flex w-full max-w-full flex-wrap gap-1 rounded-[10px] border border-slate-200 bg-[#f8faff] p-1 sm:w-fit sm:flex-nowrap">
                {copy.cases.items.map((item, index) => (
                  <motion.button
                    aria-label={item.label}
                    className={cx(
                      "inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 overflow-hidden rounded-[8px] px-0 text-sm font-semibold transition-[background-color,color,box-shadow] sm:h-auto sm:flex-none sm:px-4 sm:py-2.5",
                      activeCase === index
                        ? "bg-white text-[#1e3a8a] shadow-[0_1px_4px_rgba(15,23,42,0.08)]"
                        : "text-slate-600 hover:text-slate-950",
                    )}
                    key={item.label}
                    layout
                    onClick={() => setActiveCase(index)}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    type="button"
                    whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                  >
                    <CaseTabIcon index={index} />
                    <span className="hidden min-w-0 truncate sm:inline">
                      {item.label}
                    </span>
                  </motion.button>
                ))}
              </div>
              <AnimatePresence initial={false} mode="wait">
                <motion.p
                  animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  className="mt-3 text-center text-sm font-semibold text-[#1e3a8a] sm:hidden"
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                  initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 4 }}
                  key={activeCaseItem.label}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                >
                  {activeCaseItem.label}
                </motion.p>
              </AnimatePresence>
            </div>
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)] lg:items-center"
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
                key={`${locale}-${activeCase}`}
                transition={{ duration: 0.26, ease: "easeOut" }}
              >
                <div>
                  <blockquote className="border-l-[3px] border-primary pl-4 text-[1.06rem] leading-7 text-slate-800">
                    “{activeCaseItem.quote}”
                    <footer className="mt-3 text-sm font-medium text-muted-foreground">
                      {activeCaseItem.author}
                    </footer>
                  </blockquote>
                  <div className="mt-8">
                    <p className="mb-4 text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
                      {activeCaseItem.resultLabel}
                    </p>
                    <div className="overflow-hidden rounded-[9px] border border-slate-200 bg-white/55 text-sm leading-6 text-slate-700">
                      {activeCaseItem.results.map((result, index) => (
                        <Fragment key={result}>
                          {index > 0 ? (
                            <Separator className="bg-slate-200/80" />
                          ) : null}
                          <div className="flex items-start gap-3 px-4 py-3">
                            <CaseResultIcon index={index} />
                            <p>{result}</p>
                          </div>
                        </Fragment>
                      ))}
                      <Separator className="bg-slate-200/80" />
                      <div className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <CaseResultIcon index={3} />
                          <p>
                            {locale === "ru"
                              ? "Новость отправлена:"
                              : locale === "es"
                                ? "Noticia enviada:"
                                : locale === "ar"
                                  ? "تم إرسال الخبر:"
                                  : "Company news sent:"}
                          </p>
                        </div>
                        <div className="mt-2 ml-7 rounded-[8px] border border-blue-100 bg-[#eff6ff] px-3 py-2.5">
                          <p className="text-[0.62rem] font-bold tracking-[0.12em] text-primary uppercase">
                            {activeCaseItem.newsLabel}
                          </p>
                          <p className="mt-1 text-sm leading-6">
                            {activeCaseItem.newsText}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative mx-auto w-full max-w-[250px] lg:max-w-[255px]">
                  <div className="relative min-h-[34rem] overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_4px_6px_rgba(15,23,42,0.06),0_24px_70px_rgba(37,99,235,0.18)]">
                    <Image
                      alt="HiTeam application mockup"
                      className="object-cover object-top"
                      fill
                      sizes="(min-width: 1024px) 255px, 78vw"
                      src={`/1${mockupLocale}.webp`}
                    />
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        <section className="bg-white px-6 py-20 md:px-12 md:py-[88px]">
          <div className="mx-auto max-w-[1120px]">
            <SectionHeading
              eyebrow={copy.features.eyebrow}
              title={copy.features.title}
            />
            <div className="grid overflow-hidden rounded-[14px] border border-slate-200 bg-slate-200 md:grid-cols-2 lg:grid-cols-3">
              {copy.features.items.map((feature, index) => {
                const iconName = FEATURE_ICON_NAMES[index] ?? "clock";

                return (
                  <motion.article
                    className="bg-white px-6 py-7 transition hover:bg-[#f8faff]"
                    initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                    key={feature.title}
                    transition={{
                      delay: (index % 3) * 0.04,
                      duration: 0.4,
                      ease: "easeOut",
                    }}
                    viewport={{ amount: 0.25, once: true }}
                    whileInView={
                      reduceMotion ? undefined : { opacity: 1, y: 0 }
                    }
                  >
                    <div className="mb-4">
                      <FeatureIcon name={iconName} />
                    </div>
                    <h3 className="text-sm font-bold leading-snug">
                      {feature.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                      {feature.body}
                    </p>
                  </motion.article>
                );
              })}
            </div>
            <div className="mt-5 grid gap-8 rounded-[14px] bg-[#1e3a8a] px-7 py-8 text-white md:grid-cols-[1fr_auto] md:px-11 md:py-10">
              <div>
                <h3 className="text-[1.375rem] leading-snug font-extrabold">
                  {copy.features.bannerTitle}
                </h3>
                <p className="mt-3 max-w-[28rem] text-sm leading-7 text-white/70">
                  {copy.features.bannerBody}
                </p>
              </div>
              <div className="grid min-w-[12rem] content-center gap-2 text-sm">
                {copy.features.bad.map((item) => (
                  <span className="flex items-center gap-2" key={item}>
                    <span className="w-3 text-red-300">x</span>
                    <span className="text-white/45 line-through decoration-white/35">
                      {item}
                    </span>
                  </span>
                ))}
                {copy.features.good.map((item) => (
                  <span className="flex items-center gap-2" key={item}>
                    <span className="w-3 text-emerald-300">✓</span>
                    <span className="font-semibold text-white">{item}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          className="px-6 py-20 md:px-12 md:py-[88px]"
          style={{
            background: "linear-gradient(180deg, #f5f7fc 0%, #eef3fb 100%)",
          }}
        >
          <div className="mx-auto max-w-[1120px]">
            <SectionHeading
              eyebrow={copy.integrations.eyebrow}
              title={copy.integrations.title}
              subtitle={copy.integrations.subtitle}
            />

            <div className="mt-14">
              <p className="mb-4 text-xs font-bold tracking-[0.14em] text-slate-500 uppercase">
                {copy.integrations.availableLabel}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {copy.integrations.available.map((item, index) => (
                  <motion.article
                    className={cx(
                      "flex min-h-[140px] flex-col items-center justify-center rounded-[12px] border bg-white px-4 py-6 text-center",
                      item.contact
                        ? "border-dashed border-slate-300"
                        : "border-slate-200",
                    )}
                    initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                    key={item.name}
                    transition={{
                      delay: index * 0.035,
                      duration: 0.38,
                      ease: "easeOut",
                    }}
                    viewport={{ amount: 0.3, once: true }}
                    whileInView={
                      reduceMotion ? undefined : { opacity: 1, y: 0 }
                    }
                  >
                    <IntegrationIcon name={item.icon} />
                    <h3
                      className={cx(
                        "mt-3 text-sm font-bold",
                        item.contact ? "text-primary" : "text-slate-950",
                      )}
                    >
                      {item.name}
                    </h3>
                    <p className="mt-2 text-xs text-slate-500">{item.meta}</p>
                  </motion.article>
                ))}
              </div>
            </div>

            <div className="mt-9">
              <p className="mb-4 text-xs font-bold tracking-[0.14em] text-slate-500 uppercase">
                {copy.integrations.comingSoonLabel}
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                {copy.integrations.soon.map((item, index) => (
                  <motion.article
                    className="flex items-center gap-4 rounded-[12px] border border-slate-200 bg-[#f8faff] px-6 py-4"
                    initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                    key={item.name}
                    transition={{
                      delay: index * 0.04,
                      duration: 0.38,
                      ease: "easeOut",
                    }}
                    viewport={{ amount: 0.35, once: true }}
                    whileInView={
                      reduceMotion ? undefined : { opacity: 1, y: 0 }
                    }
                  >
                    {item.icon === "salon" ? (
                      <Image
                        alt="Altegio logo"
                        className="h-7 w-7 shrink-0 object-contain"
                        height={28}
                        src="/altegio.webp"
                        style={{
                          filter:
                            "brightness(0) saturate(100%) invert(53%) sepia(86%) saturate(1289%) hue-rotate(176deg) brightness(98%) contrast(92%)",
                        }}
                        width={28}
                      />
                    ) : (
                      <IntegrationIcon name={item.icon} />
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-slate-700">
                        {item.name}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">{item.meta}</p>
                    </div>
                    <span className="text-xs font-semibold text-amber-600">
                      {item.badge}
                    </span>
                  </motion.article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          className="hidden px-6 py-20 md:block md:px-12 md:py-[88px]"
          id="mobile"
          style={{
            background: "linear-gradient(180deg, #f5f7fc 0%, #eef3fb 100%)",
          }}
        >
          <div className="mx-auto flex max-w-[1120px] flex-col items-center gap-14 lg:flex-row lg:gap-20">
            <Reveal
              className={cx("max-w-xl flex-1", isRtl ? "text-right" : "")}
            >
              <span className="mb-3 block text-[0.7rem] font-bold tracking-[0.12em] text-primary uppercase">
                {copy.mobile.eyebrow}
              </span>
              <h2 className="text-[clamp(1.9rem,5vw,3.2rem)] leading-[1.04] font-extrabold tracking-[-0.02em]">
                {copy.mobile.titleLines.map((line) => (
                  <span className="block" key={line}>
                    {line}
                  </span>
                ))}
              </h2>
              <p className="mt-6 max-w-[48ch] text-base leading-8 text-muted-foreground">
                {copy.mobile.body}
              </p>
              <ul className="mt-7 space-y-4">
                {copy.mobile.bullets.map((item) => (
                  <CheckLine key={item}>{item}</CheckLine>
                ))}
              </ul>
              <div className="mt-9 flex flex-wrap gap-3">
                <AppStoreButton
                  className="shrink-0 shadow-[0_16px_40px_rgba(15,23,42,0.16)] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 active:scale-[0.96]"
                  href={IOS_APP_URL}
                  rel="noreferrer"
                  size="md"
                  target="_blank"
                />
                <GooglePlayButton
                  className="shrink-0 shadow-[0_16px_40px_rgba(15,23,42,0.16)] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 active:scale-[0.96]"
                  href={ANDROID_APP_URL}
                  rel="noreferrer"
                  size="md"
                  target="_blank"
                />
              </div>
            </Reveal>
            <Reveal className="relative" delay={0.08}>
              <div className="relative rounded-[3.4rem] bg-[#1e3a8a] p-2.5 shadow-[0_38px_120px_rgba(47,99,255,0.20)]">
                <div className="absolute top-0 left-1/2 z-20 h-[30px] w-[136px] -translate-x-1/2 rounded-b-[1.35rem] bg-[#1e3a8a]" />
                <div className="relative aspect-[9/19.5] w-[min(78vw,330px)] overflow-hidden rounded-[2.9rem] bg-white">
                  <img
                    alt="HiTeam mobile app screenshot"
                    className="h-full w-full object-cover object-top"
                    src={locale === "ru" ? "/mob_ru.webp" : "/mob_en.webp"}
                  />
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section
          className="bg-white px-6 py-20 md:px-12 md:py-[88px]"
          id="pricing"
        >
          <div className="mx-auto max-w-[1120px]">
            <SectionHeading
              eyebrow={copy.pricing.eyebrow}
              title={copy.pricing.title}
              subtitle={copy.pricing.subtitle}
              center
            />
            <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.95fr)]">
              <motion.div
                className="flex h-full flex-col rounded-2xl border border-slate-200 bg-[#f8faff] p-5 sm:p-8"
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                transition={{ duration: 0.48, ease: "easeOut" }}
                viewport={{ amount: 0.28, once: true }}
                whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row">
                  <div>
                    <h3 className="text-2xl font-semibold tracking-[-0.035em]">
                      {copy.pricing.calcTitle}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {copy.pricing.calcSubtitle}
                    </p>
                  </div>
                  <div className="px-1 py-1 text-center">
                    <p className="text-3xl font-bold tracking-[-0.05em] text-primary tabular-nums">
                      {employeeCount}
                    </p>
                    <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                      {copy.pricing.employeeUnit}
                    </p>
                  </div>
                </div>
                <div className="mt-auto">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <span className="text-sm font-semibold">
                        {copy.pricing.employeesLabel}
                      </span>
                      <Select
                        onValueChange={(value) =>
                          setEmployeeCount(Number(value))
                        }
                        value={String(employeeCount)}
                      >
                        <SelectTrigger className="h-12 min-h-12 rounded-[10px] border-primary px-4 py-0 text-left text-sm font-semibold text-primary shadow-none hover:shadow-[0_0_0_4px_rgba(47,99,255,0.08)] focus:ring-primary/20 data-[state=open]:scale-100 [&>span:first-child]:text-left">
                          <SelectValue className="text-left" />
                        </SelectTrigger>
                        <SelectContent className="rounded-[14px] border-slate-200 shadow-[0_18px_48px_rgba(15,23,42,0.14)]">
                          {EMPLOYEE_OPTIONS.map((value) => (
                            <SelectItem
                              className="rounded-[10px] text-sm font-normal text-primary data-[state=checked]:bg-primary data-[state=checked]:text-white"
                              key={value}
                              value={String(value)}
                            >
                              {value === 200 ? "200+" : value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <span className="text-sm font-semibold">
                        {copy.pricing.durationLabel}
                      </span>
                      <Select
                        onValueChange={(value) =>
                          setDurationKey(value as PricingDurationKey)
                        }
                        value={durationKey}
                      >
                        <SelectTrigger className="h-12 min-h-12 rounded-[10px] border-primary px-4 py-0 text-left text-sm font-semibold text-primary shadow-none hover:shadow-[0_0_0_4px_rgba(47,99,255,0.08)] focus:ring-primary/20 data-[state=open]:scale-100 [&>span:first-child]:text-left">
                          <SelectValue className="text-left" />
                        </SelectTrigger>
                        <SelectContent className="rounded-[14px] border-slate-200 shadow-[0_18px_48px_rgba(15,23,42,0.14)]">
                          {(
                            Object.keys(
                              PRICING_DURATIONS,
                            ) as PricingDurationKey[]
                          ).map((key) => (
                            <SelectItem
                              className="rounded-[10px] text-sm font-normal text-primary data-[state=checked]:bg-primary data-[state=checked]:text-white"
                              key={key}
                              value={key}
                            >
                              {copy.pricing.durationLabels[key]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-6 rounded-[13px] border-2 border-amber-300 bg-white p-6">
                    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-600">
                          {copy.pricing.durationLabels[durationKey]}
                        </p>
                        <p className="text-sm font-bold text-emerald-600">
                          {copy.pricing.bonusLabels[durationKey]}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-bold text-emerald-600">
                        {copy.pricing.saveLabels[durationKey]}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                      <p className="text-5xl font-semibold tracking-[-0.06em] text-slate-950">
                        {formatMoney(pricing.unitPrice)}
                      </p>
                      <p className="pb-2 text-sm text-muted-foreground">
                        {copy.pricing.perEmployee}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {copy.pricing.oldPrefix}
                    </p>
                    <p className="mt-4 text-lg font-semibold text-slate-950">
                      {totalText}
                    </p>
                    <Button
                      asChild
                      className="mt-6 h-12 w-full rounded-[9px] text-white hover:text-white"
                    >
                      <a href="/login">{copy.pricing.cta}</a>
                    </Button>
                  </div>
                  <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
                    {copy.pricing.note}
                  </p>
                </div>
              </motion.div>
              <motion.div
                className="grid h-full gap-4"
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                transition={{ delay: 0.08, duration: 0.48, ease: "easeOut" }}
                viewport={{ amount: 0.28, once: true }}
                whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              >
                {(["monthly", "six", "year"] as const).map((key) => {
                  const option = PRICING_DURATIONS[key];
                  const isSelected = durationKey === key;

                  return (
                    <motion.article
                      aria-pressed={isSelected}
                      className={cx(
                        "flex min-h-[0] cursor-pointer flex-col rounded-[14px] border bg-white p-4 text-left transition-[border-color,box-shadow,background-color] duration-150 outline-none hover:border-primary/70 hover:shadow-[0_18px_44px_rgba(15,23,42,0.10)] focus-visible:ring-2 focus-visible:ring-primary/20 sm:p-5",
                        isSelected
                          ? "border-primary ring-4 ring-primary/10"
                          : "border-slate-200",
                      )}
                      key={key}
                      layout
                      onClick={() => setDurationKey(key)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setDurationKey(key);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      whileHover={reduceMotion ? undefined : { y: -2 }}
                      whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold tracking-[-0.035em]">
                            {copy.pricing.durationLabels[key]}
                          </h3>
                          <p className="mt-1 text-sm font-semibold text-emerald-600">
                            {copy.pricing.bonusLabels[key]}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-bold text-emerald-600">
                          {copy.pricing.saveLabels[key]}
                        </span>
                      </div>
                      <div className="mt-auto pt-4">
                        <div className="flex min-w-0 items-end gap-x-2">
                          <p className="text-[1.75rem] font-semibold tracking-[-0.06em] text-slate-950 sm:text-3xl">
                            {formatMoney(option.unitPrice)}
                          </p>
                          <p className="pb-1 text-[0.68rem] whitespace-nowrap text-muted-foreground sm:text-xs">
                            {copy.pricing.perEmployee}
                          </p>
                        </div>
                        <span
                          className={cx(
                            "mt-3 flex h-10 w-full items-center justify-center rounded-[9px] text-sm font-medium transition-[background-color,color] sm:mt-4",
                            isSelected
                              ? "bg-primary text-white"
                              : "bg-secondary text-primary",
                          )}
                        >
                          {copy.pricing.cta}
                        </span>
                      </div>
                    </motion.article>
                  );
                })}
              </motion.div>
            </div>
          </div>
        </section>

        <section
          className="px-6 py-20 md:px-12 md:py-[88px]"
          style={{
            background: "linear-gradient(180deg, #f5f7fc 0%, #eef3fb 100%)",
          }}
        >
          <div className="mx-auto max-w-[1120px]">
            <SectionHeading
              eyebrow={copy.testimonials.eyebrow}
              title={copy.testimonials.title}
            />
            <div className="grid items-stretch gap-5 md:grid-cols-3">
              {copy.testimonials.items.map((item, index) => {
                const avatar =
                  TESTIMONIAL_AVATARS[index % TESTIMONIAL_AVATARS.length];

                return (
                  <motion.article
                    className="flex h-full flex-col rounded-[14px] border border-slate-200 bg-white p-7"
                    initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                    key={item.name}
                    transition={{
                      delay: index * 0.06,
                      duration: 0.42,
                      ease: "easeOut",
                    }}
                    viewport={{ amount: 0.35, once: true }}
                    whileInView={
                      reduceMotion ? undefined : { opacity: 1, y: 0 }
                    }
                  >
                    <RatingStars />
                    <p className="mt-5 text-base leading-7 text-slate-700">
                      {item.quote}
                    </p>
                    <div className="mt-auto pt-7">
                      <div className="flex items-center gap-3 border-t border-slate-200 pt-4">
                        <img
                          alt={item.name}
                          className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-black/10"
                          src={getMockAvatarDataUrl(
                            avatar.seed,
                            avatar.gender,
                          )}
                        />
                        <div className="min-w-0">
                          <p className="font-semibold">{item.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.role}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        <section
          className="bg-white px-6 py-20 md:px-12 md:py-[88px]"
          id="questions"
        >
          <div className="mx-auto max-w-[720px]">
            <SectionHeading
              eyebrow={copy.faq.eyebrow}
              title={copy.faq.title}
              center
            />
            <div className="border-b border-slate-200">
              {copy.faq.items.map((item, index) => (
                <article className="border-t border-slate-200" key={item.q}>
                  <button
                    aria-expanded={openFaq === index}
                    className="flex w-full min-w-0 items-center justify-between gap-4 overflow-hidden py-5 text-left text-sm font-semibold text-slate-950 transition hover:text-primary"
                    onClick={() =>
                      setOpenFaq((current) =>
                        current === index ? null : index,
                      )
                    }
                    type="button"
                  >
                    <span className="min-w-0 flex-1 break-words">
                      {item.q}
                    </span>
                    <motion.span
                      animate={{ rotate: openFaq === index ? 45 : 0 }}
                      className="shrink-0 text-lg font-normal leading-none text-slate-400"
                      transition={{ duration: 0.18, ease: "easeOut" }}
                    >
                      +
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {openFaq === index ? (
                      <motion.div
                        animate={{ height: "auto", opacity: 1 }}
                        className="overflow-hidden"
                        exit={{ height: 0, opacity: 0 }}
                        initial={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.24, ease: "easeOut" }}
                      >
                        <motion.p
                          animate={reduceMotion ? { y: 0 } : { y: 0 }}
                          className="pb-5 text-sm leading-7 text-muted-foreground"
                          initial={reduceMotion ? false : { y: -4 }}
                          transition={{ duration: 0.22, ease: "easeOut" }}
                        >
                          {item.a}
                        </motion.p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#24418f] px-6 py-10 text-white md:px-10 md:py-12">
          <Reveal className="mx-auto grid max-w-[1120px] items-center gap-10 md:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <h2 className="max-w-[13ch] text-[clamp(3rem,5vw,4.125rem)] leading-[0.92] font-extrabold tracking-[-0.03em] text-white">
                {(Array.isArray(copy.cta.title)
                  ? copy.cta.title
                  : [copy.cta.title]
                ).map((line) => (
                  <span className="block" key={line}>
                    {line}
                  </span>
                ))}
              </h2>
              <p className="mt-6 max-w-[42rem] text-lg leading-8 text-white/72">
                {copy.cta.subtitle}
              </p>
              <p className="mt-5 max-w-[42rem] text-sm italic text-white/70">
                {copy.cta.italic}
              </p>
            </div>
            <div className="flex flex-col justify-center gap-3 sm:flex-row md:items-center">
              <Button
                asChild
                className="h-12 min-w-[165px] rounded-[8px] bg-white px-7 !text-black hover:bg-white/90 hover:!text-black"
              >
                <a href="/login">{copy.cta.primary}</a>
              </Button>
              <Button
                className="h-12 min-w-[165px] rounded-[8px] border-white/40 bg-white/10 px-7 text-white hover:bg-white/15"
                onClick={() => setIsDemoOpen(true)}
                variant="outline"
              >
                {copy.cta.secondary}
              </Button>
            </div>
          </Reveal>
        </section>
      </main>

      <footer
        className="border-t border-slate-200 px-6 py-12 md:px-12"
        id="footer"
        style={{
          background: "linear-gradient(180deg, #f5f7fc 0%, #eef3fb 100%)",
        }}
      >
        <div className="mx-auto max-w-[1120px]">
          <div className="grid gap-8 md:grid-cols-[2fr_1fr_1fr_1.2fr]">
            <div>
              <BrandWordmark className="text-[2rem]" />
              <p className="mt-4 max-w-[32ch] text-sm leading-7 text-muted-foreground">
                {copy.footer.description}
              </p>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold">
                {copy.footer.product}
              </h4>
              <div className="grid gap-3">
                {copy.footer.links.map((link, index) => (
                  <button
                    className="text-left text-sm text-muted-foreground hover:text-foreground"
                    key={link}
                    onClick={() =>
                      scrollTo(
                        index === 2
                          ? "pricing"
                          : index === copy.footer.links.length - 1
                            ? "mobile"
                            : "how",
                      )
                    }
                    type="button"
                  >
                    {link}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold">
                {copy.footer.company}
              </h4>
              <div className="grid gap-3 text-sm text-muted-foreground">
                <span>ALT TECHNOLOGIES L.L.C</span>
                <span>Dubai, UAE</span>
              </div>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold">
                {copy.footer.contacts}
              </h4>
              <div className="grid gap-3">
                {copy.footer.legal.map((link, index) => (
                  <a
                    className="text-sm text-muted-foreground hover:text-foreground"
                    href={footerLegalHrefs[index] ?? "/terms-en"}
                    key={link}
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-10 flex flex-col justify-between gap-5 border-t border-slate-200 pt-7 md:flex-row md:items-center">
            <p className="text-xs text-muted-foreground">
              {copy.footer.copyright}
            </p>
          </div>
        </div>
      </footer>

      <Dialog open={isDemoOpen} onOpenChange={setIsDemoOpen}>
        <DialogContent
          className="sm:max-w-[425px] duration-200 ease-out data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-bottom-1 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-2"
          dir={copy.dir}
        >
          <DialogHeader
            className={cx(isRtl ? "text-right" : "text-center sm:text-center")}
          >
            <DialogTitle className="text-2xl font-bold">
              {copy.demo.title}
            </DialogTitle>
            <DialogDescription className="text-base">
              {copy.demo.subtitle}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 animate-in fade-in slide-in-from-bottom-1 duration-300">
            <Input
              className="h-12"
              onChange={(event) => setDemoName(event.target.value)}
              placeholder={copy.demo.name}
              value={demoName}
            />
            <Input
              className="h-12"
              onChange={(event) => setDemoEmail(event.target.value)}
              placeholder={copy.demo.email}
              type="email"
              value={demoEmail}
            />
            <Input
              className="h-12"
              onChange={(event) => setDemoPhone(event.target.value)}
              placeholder={copy.demo.phone}
              type="tel"
              value={demoPhone}
            />
            <label
              className={cx(
                "mt-2 flex items-start gap-3 text-sm leading-snug text-muted-foreground",
                isRtl ? "text-right" : "text-left",
              )}
            >
              <Checkbox
                className="mt-0.5"
                checked={termsAccepted}
                onCheckedChange={(checked) =>
                  setTermsAccepted(checked === true)
                }
              />
              <span>{copy.demo.terms}</span>
            </label>
          </div>
          <Button
            className="h-12 w-full text-base"
            disabled={!isDemoValid}
            type="button"
          >
            {copy.demo.button}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SalesLandingPage;
