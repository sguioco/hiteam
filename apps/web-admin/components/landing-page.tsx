"use client";

import type {
  AnchorHTMLAttributes,
  CSSProperties,
  FC,
  HTMLAttributes,
} from "react";
import { useEffect, useRef, useState } from "react";
import createGlobe from "cobe";
import {
  ChartBreakoutSquare,
  MessageChatCircle,
  ZapFast,
} from "@untitledui/icons";
import { BrandWordmark } from "./brand-wordmark";
import { cx } from "@/lib/utils/cx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { petersburgHero } from "@/app/landing-hero-font";

type GlobeOverlayItem =
  | {
    id: string;
    type: "polaroid";
    location: [number, number];
    image: string;
    alt: string;
    title: string;
    frameWidth?: number;
    imageHeight?: number;
    rotation?: number;
    titleVariant?: "default" | "badge";
    cardClassName?: string;
    titleWrapperClassName?: string;
    titleTextClassName?: string;
    titleSizeClassName?: string;
    size: number;
    offsetX?: number;
    offsetY?: number;
  }
  | {
    id: string;
    type: "chip";
    location: [number, number];
    text: string;
    tone: "emerald" | "ink" | "blue" | "red" | "success" | "mint";
    rotation?: number;
    size: number;
    offsetX?: number;
    offsetY?: number;
  };

const GLOBE_OVERLAY_ITEMS: GlobeOverlayItem[] = [
  {
    id: "almaty-pulse",
    type: "chip",
    location: [56.1304, -106.3468],
    text: "Task completed",
    tone: "success",
    rotation: -8,
    size: 0.028,
    offsetX: -26,
    offsetY: 35,
  },
  {
    id: "london-shift",
    type: "chip",
    location: [51.5072, -0.1276],
    text: "Shift started",
    tone: "mint",
    rotation: -4,
    size: 0.028,
    offsetX: -94,
    offsetY: 35,
  },
  {
    id: "dubai-verified",
    type: "polaroid",
    location: [-1.2864, 33.8172],
    image: "/room.webp",
    alt: "Room photo.",
    title: "Photo task",
    titleVariant: "badge",
    cardClassName:
      "bg-[#44944A] ring-[#44944A]/25 shadow-[0_26px_60px_rgba(68,148,74,0.18)]",
    titleWrapperClassName: "bg-[#44944A]",
    titleTextClassName: "text-white",
    rotation: 6,
    size: 0.028,
    offsetX: 160,
    offsetY: 15,
  },
  {
    id: "berlin-face",
    type: "chip",
    location: [52.52, 13.405],
    text: "Face verified",
    tone: "blue",
    rotation: 2,
    size: 0.028,
    offsetX: 92,
    offsetY: 120,
  },
  {
    id: "singapore-proof",
    type: "polaroid",
    location: [1.3521, 103.8198],
    image:
      "https://www.untitledui.com/images/avatars/transparent/drew-cano?bg=%23D9E5CC",
    alt: "Portrait on a transparent background.",
    title: "VERIFIED",
    frameWidth: 82,
    imageHeight: 102,
    titleVariant: "badge",
    titleTextClassName: "text-[#44944A]",
    rotation: -6,
    size: 0.028,
    offsetX: -42,
    offsetY: 40,
  },
  {
    id: "nairobi-photo",
    type: "chip",
    location: [42, 62],
    text: "Alex is late",
    tone: "red",
    rotation: 4,
    size: 0.028,
    offsetX: 104,
    offsetY: 34,
  },
  {
    id: "sao-paulo-ops",
    type: "polaroid",
    location: [-23.5505, -46.6333],
    image: "/geo.webp",
    alt: "Geo photo.",
    title: "Login attempt",
    frameWidth: 94,
    titleVariant: "badge",
    titleSizeClassName: "text-[0.52rem]",
    titleTextClassName: "text-slate-900 tracking-[0.12em]",
    rotation: 5,
    size: 0.028,
    offsetX: -18,
    offsetY: 10,
  },
  {
    id: "tokyo-signoff",
    type: "chip",
    location: [35.6762, 139.6503],
    text: "Ken ended his shift",
    tone: "ink",
    rotation: 4,
    size: 0.028,
    offsetX: 88,
    offsetY: 35,
  },
];

/** `bg-primary` / --primaryrgb(160, 186, 241) (light theme); COBE expects linear RGB 0–1 */
const LANDING_PRIMARY_COBE_RGB: [number, number, number] = [
  224 / 255,
  202 / 255,
  252 / 255,
];

/** COBE uses one baseColor for land + ocean; low mix + low diffuse ⇒ land reads black. ~0.38–0.45 reads as blue land, light ocean. */
const GLOBE_BASE_COLOR_MIX = 0.42;
const GLOBE_BASE_COLOR: [number, number, number] = [
  (1 - GLOBE_BASE_COLOR_MIX) + GLOBE_BASE_COLOR_MIX * LANDING_PRIMARY_COBE_RGB[0],
  (1 - GLOBE_BASE_COLOR_MIX) + GLOBE_BASE_COLOR_MIX * LANDING_PRIMARY_COBE_RGB[1],
  (1 - GLOBE_BASE_COLOR_MIX) + GLOBE_BASE_COLOR_MIX * LANDING_PRIMARY_COBE_RGB[2],
];

const GLOBE_INITIAL_PHI = 0.52;
const GLOBE_THETA = 0.33;
const GLOBE_SCALE = 1;
const GLOBE_ROTATION_STEP = 0.0025;
const GLOBE_OFFSET_Y = 20;
const GLOBE_GLOBAL_OFFSET_Y = 0;
const GLOBE_POLAROID_OFFSET_Y = 100;

type LandingLocale = "ru" | "en";

type GlobeAnchorStyle = CSSProperties & {
  positionAnchor?: string;
};

function buildGlobeOverlayTransform(item: GlobeOverlayItem) {
  const offsetY =
    (item.offsetY ?? 0) +
    (item.type === "polaroid" ? GLOBE_POLAROID_OFFSET_Y : 0);
  return `translate(-50%, calc(-100% - ${GLOBE_OFFSET_Y - (GLOBE_GLOBAL_OFFSET_Y + offsetY)}px))`;
}

function buildGlobeAnchorStyle(item: GlobeOverlayItem): GlobeAnchorStyle {
  const visibilityVar = `var(--cobe-visible-${item.id}, 0)`;
  const shownVar = `clamp(0, calc((${visibilityVar} - 0.4) * 2), 1)`;

  return {
    positionAnchor: `--cobe-${item.id}`,
    bottom: "anchor(top)",
    left: "anchor(center)",
    opacity: shownVar,
    filter: `blur(calc((1 - ${shownVar}) * 12px))`,
    transform: buildGlobeOverlayTransform(item),
    "--item-scale":
      item.type === "polaroid"
        ? `calc(0.85 + 0.15 * ${shownVar})`
        : `calc(0.65 + 0.35 * ${shownVar})`,
    "--item-rotate":
      item.type === "polaroid" ? `calc((1 - ${shownVar}) * 35deg)` : "0deg",
  } as React.CSSProperties;
}

function projectGlobeLocation(
  location: [number, number],
  phi: number,
  theta: number,
  width: number,
  height: number,
  scale = 1,
) {
  const [lat, lon] = location;
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180 - Math.PI;
  const cosLat = Math.cos(latRad);

  const worldX = -cosLat * Math.cos(lonRad);
  const worldY = Math.sin(latRad);
  const worldZ = cosLat * Math.sin(lonRad);

  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const sinTheta = Math.sin(theta);
  const cosTheta = Math.cos(theta);

  const cameraX = worldX * cosPhi + worldZ * sinPhi;
  const cameraY =
    sinTheta * (worldX * sinPhi - worldZ * cosPhi) + worldY * cosTheta;
  const cameraZ =
    cosTheta * (-worldX * sinPhi + worldZ * cosPhi) + worldY * sinTheta;

  const visibility = Math.max(0, Math.min(1, (cameraZ + 0.3) / 0.62));
  const normalizedX = 0.84 * cameraX;
  const normalizedY = 0.84 * cameraY;

  return {
    x: ((normalizedX * scale + 1) * width) / 2,
    y: ((1 - normalizedY * scale) * height) / 2,
    visibility,
    depth: cameraZ,
  };
}

function GlobeMarkerPin() {
  return null;
}

function GlobeStatusChip({
  item,
  overlayRef,
}: {
  item: Extract<GlobeOverlayItem, { type: "chip" }>;
  overlayRef?: (node: HTMLDivElement | null) => void;
}) {
  const hasShimmer = item.tone === "ink" || item.tone === "success";

  const toneStyles = {
    emerald: {
      chip: "bg-[#d8f3e6] text-[#18794e] ring-[#b8edd7]/90 shadow-[0_20px_45px_rgba(62,167,107,0.18)]",
    },
    ink: {
      chip: "bg-primary text-primary-foreground ring-primary/20 shadow-[0_20px_45px_rgba(37,99,235,0.24)]",
    },
    blue: {
      chip: "bg-[#eef4ff] text-[#1d4ed8] ring-[#bfdbfe]/90 shadow-[0_20px_45px_rgba(59,130,246,0.16)]",
    },
    red: {
      chip: "bg-[#e45454] text-white ring-[#e45454]/20 shadow-[0_20px_45px_rgba(228,84,84,0.24)]",
    },
    success: {
      chip: "bg-[#44944A] text-white ring-[#44944A]/20 shadow-[0_20px_45px_rgba(68,148,74,0.24)]",
    },
    mint: {
      chip: "bg-white text-black ring-black/8 shadow-[0_20px_45px_rgba(15,23,42,0.12)]",
    },
  }[item.tone];

  return (
    <div
      className="pointer-events-none absolute z-20 hidden origin-bottom transition-[opacity,filter,transform] duration-[400ms] ease-out will-change-transform md:block"
      ref={overlayRef}
      style={buildGlobeAnchorStyle(item)}
    >
      <div
        style={{
          transformOrigin: "center bottom",
          transform: "scale(var(--item-scale)) rotateX(var(--item-rotate))",
        }}
      >
        <div
          className={cx(
            "globe-chip-pulse relative inline-flex w-max items-center whitespace-nowrap rounded-full px-3 py-2 text-[0.62rem] font-semibold tracking-[0.18em] uppercase ring-1 backdrop-blur-sm",
            toneStyles.chip,
          )}
        >
          <span className={hasShimmer ? "globe-shimmer-text" : ""}>{item.text}</span>
        </div>
      </div>
      <GlobeMarkerPin />
    </div>
  );
}

function GlobePolaroidCard({
  item,
  overlayRef,
}: {
  item: Extract<GlobeOverlayItem, { type: "polaroid" }>;
  overlayRef?: (node: HTMLDivElement | null) => void;
}) {
  const frameWidth = item.frameWidth ?? 92;
  const imageHeight = item.imageHeight ?? 72;
  const titleVariant = item.titleVariant ?? "default";
  const cardClassName =
    item.cardClassName ??
    "bg-white shadow-[0_26px_60px_rgba(15,23,42,0.16)] ring-1 ring-slate-900/8";
  const titleWrapperClassName = item.titleWrapperClassName ?? "bg-white";
  const titleTextClassName = item.titleTextClassName ?? "text-slate-900";
  const titleSizeClassName = item.titleSizeClassName;

  return (
    <div
      className="pointer-events-none absolute z-20 hidden origin-bottom transition-[opacity,filter,transform] duration-[400ms] ease-out will-change-transform md:block"
      ref={overlayRef}
      style={buildGlobeAnchorStyle(item)}
    >
      <div
        style={{
          transformOrigin: "center bottom",
          transform: "scale(var(--item-scale)) rotateX(var(--item-rotate))",
        }}
      >
        <div
          className="animate-[polaroidFloat_4s_ease-in-out_infinite]"
          style={{
            transformOrigin: "center bottom",
            animationDelay: `${Math.random() * 2}s`,
          }}
        >
          <div className={cx("globe-polaroid-glow px-2.5 pt-2.5 pb-0 ring-1 rounded-xl", cardClassName)}>
            <div
              className="overflow-hidden rounded-lg bg-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
              style={{ width: `${frameWidth}px` }}
            >
              <img
                alt={item.alt}
                className="w-full object-cover transition-transform duration-700 hover:scale-105"
                style={{ height: `${imageHeight}px` }}
                src={item.image}
              />
              <div className={cx("py-1.5 text-center", titleWrapperClassName)}>
                <p
                  className={cx(
                    "globe-shimmer-text block w-full text-center whitespace-nowrap",
                    titleVariant === "badge"
                      ? "leading-[1.15] font-semibold tracking-[0.18em] uppercase"
                      : "text-[11px] leading-none font-medium tracking-[-0.02em]",
                    titleVariant === "badge" && (titleSizeClassName ?? "text-[0.62rem]"),
                    titleTextClassName,
                  )}
                >
                  {item.title}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <GlobeMarkerPin />
    </div>
  );
}

const AlternateImageMockup: FC<HTMLAttributes<HTMLDivElement>> = (props) => {
  return (
    <div
      className={cx(
        "size-full rounded-[18px] bg-primary p-[1px] shadow-[0_24px_60px_rgba(15,23,42,0.18)] ring-1 ring-primary/15 ring-inset md:rounded-[24px] md:p-[2px] lg:absolute lg:w-auto lg:max-w-none",
        props.className ?? "",
      )}
    >
      <div className="size-full rounded-[16px] bg-primary/90 p-[4px] shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] md:rounded-[22px]">
        <div className="relative size-full overflow-hidden rounded-[14px] bg-white ring-1 ring-black/5 md:rounded-[18px]">
          {props.children}
        </div>
      </div>
    </div>
  );
};

function FeatureBadge({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="inline-flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-white ring-1 ring-white/18">
        {icon}
      </div>
      <div>
        <h3 className="text-xl font-semibold text-white md:text-2xl">
          {title}
        </h3>
        <p className="mt-2 text-base leading-7 text-white/72 md:text-lg">
          {description}
        </p>
      </div>
    </div>
  );
}

function CheckItemText({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3 text-sm text-white/82 md:text-base">
      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10">
        <svg
          className="h-3.5 w-3.5 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M5 13l4 4L19 7"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.2}
          />
        </svg>
      </span>
      <span>{text}</span>
    </li>
  );
}

function getLandingMockupSrc(
  mockupNumber: 1 | 2 | 3,
  locale: LandingLocale,
) {
  return `/${mockupNumber}${locale}.webp`;
}

const GooglePlayButton = ({
  size = "md",
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { size?: "md" | "lg" }) => {
  return (
    <a
      aria-label="Get it on Google Play"
      href="#"
      {...props}
      className={cx(
        "rounded-[7px] bg-black ring-1 ring-white/12 ring-inset outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black",
        props.className ?? "",
      )}
    >
      <svg
        fill="none"
        height={size === "md" ? 40 : 44}
        viewBox="0 0 135 40"
        width={size === "md" ? 135 : 149}
      >
        <path
          d="M68.136 21.7511C65.784 21.7511 63.867 23.5401 63.867 26.0041C63.867 28.4531 65.784 30.2571 68.136 30.2571C70.489 30.2571 72.406 28.4531 72.406 26.0041C72.405 23.5401 70.488 21.7511 68.136 21.7511ZM68.136 28.5831C66.847 28.5831 65.736 27.5201 65.736 26.0051C65.736 24.4741 66.848 23.4271 68.136 23.4271C69.425 23.4271 70.536 24.4741 70.536 26.0051C70.536 27.5191 69.425 28.5831 68.136 28.5831ZM58.822 21.7511C56.47 21.7511 54.553 23.5401 54.553 26.0041C54.553 28.4531 56.47 30.2571 58.822 30.2571C61.175 30.2571 63.092 28.4531 63.092 26.0041C63.092 23.5401 61.175 21.7511 58.822 21.7511ZM58.822 28.5831C57.533 28.5831 56.422 27.5201 56.422 26.0051C56.422 24.4741 57.534 23.4271 58.822 23.4271C60.111 23.4271 61.222 24.4741 61.222 26.0051C61.223 27.5191 60.111 28.5831 58.822 28.5831ZM47.744 23.0571V24.8611H52.062C51.933 25.8761 51.595 26.6171 51.079 27.1321C50.451 27.7601 49.468 28.4531 47.744 28.4531C45.086 28.4531 43.008 26.3101 43.008 23.6521C43.008 20.9941 45.086 18.8511 47.744 18.8511C49.178 18.8511 50.225 19.4151 50.998 20.1401L52.271 18.8671C51.191 17.8361 49.758 17.0471 47.744 17.0471C44.103 17.0471 41.042 20.0111 41.042 23.6521C41.042 27.2931 44.103 30.2571 47.744 30.2571C49.709 30.2571 51.192 29.6121 52.351 28.4041C53.543 27.2121 53.914 25.5361 53.914 24.1831C53.914 23.7651 53.882 23.3781 53.817 23.0561H47.744V23.0571ZM93.052 24.4581C92.698 23.5081 91.618 21.7511 89.411 21.7511C87.22 21.7511 85.399 23.4751 85.399 26.0041C85.399 28.3881 87.204 30.2571 89.62 30.2571C91.569 30.2571 92.697 29.0651 93.165 28.3721L91.715 27.4051C91.232 28.1141 90.571 28.5811 89.62 28.5811C88.67 28.5811 87.993 28.1461 87.558 27.2921L93.245 24.9401L93.052 24.4581ZM87.252 25.8761C87.204 24.2321 88.525 23.3951 89.476 23.3951C90.217 23.3951 90.845 23.7661 91.055 24.2971L87.252 25.8761ZM82.629 30.0001H84.497V17.4991H82.629V30.0001ZM79.567 22.7021H79.503C79.084 22.2021 78.278 21.7511 77.264 21.7511C75.137 21.7511 73.188 23.6201 73.188 26.0211C73.188 28.4051 75.137 30.2581 77.264 30.2581C78.279 30.2581 79.084 29.8071 79.503 29.2921H79.567V29.9041C79.567 31.5311 78.697 32.4011 77.296 32.4011C76.152 32.4011 75.443 31.5801 75.153 30.8871L73.526 31.5641C73.993 32.6911 75.233 34.0771 77.296 34.0771C79.487 34.0771 81.34 32.7881 81.34 29.6461V22.0101H79.568V22.7021H79.567ZM77.425 28.5831C76.136 28.5831 75.057 27.5031 75.057 26.0211C75.057 24.5221 76.136 23.4271 77.425 23.4271C78.697 23.4271 79.696 24.5221 79.696 26.0211C79.696 27.5031 78.697 28.5831 77.425 28.5831ZM101.806 17.4991H97.335V30.0001H99.2V25.2641H101.805C103.873 25.2641 105.907 23.7671 105.907 21.3821C105.907 18.9971 103.874 17.4991 101.806 17.4991ZM101.854 23.5241H99.2V19.2391H101.854C103.249 19.2391 104.041 20.3941 104.041 21.3821C104.041 22.3501 103.249 23.5241 101.854 23.5241ZM113.386 21.7291C112.035 21.7291 110.636 22.3241 110.057 23.6431L111.713 24.3341C112.067 23.6431 112.727 23.4171 113.418 23.4171C114.383 23.4171 115.364 23.9961 115.38 25.0251V25.1541C115.042 24.9611 114.318 24.6721 113.434 24.6721C111.649 24.6721 109.831 25.6531 109.831 27.4861C109.831 29.1591 111.295 30.2361 112.935 30.2361C114.189 30.2361 114.881 29.6731 115.315 29.0131H115.379V29.9781H117.181V25.1851C117.182 22.9671 115.524 21.7291 113.386 21.7291ZM113.16 28.5801C112.55 28.5801 111.697 28.2741 111.697 27.5181C111.697 26.5531 112.759 26.1831 113.676 26.1831C114.495 26.1831 114.882 26.3601 115.38 26.6011C115.235 27.7601 114.238 28.5801 113.16 28.5801ZM123.743 22.0021L121.604 27.4221H121.54L119.32 22.0021H117.31L120.639 29.5771L118.741 33.7911H120.687L125.818 22.0021H123.743ZM106.937 30.0001H108.802V17.4991H106.937V30.0001Z"
          fill="white"
        />
        <path
          d="M47.418 10.2429C47.418 11.0809 47.1701 11.7479 46.673 12.2459C46.109 12.8379 45.3731 13.1339 44.4691 13.1339C43.6031 13.1339 42.8661 12.8339 42.2611 12.2339C41.6551 11.6329 41.3521 10.8889 41.3521 10.0009C41.3521 9.11194 41.6551 8.36794 42.2611 7.76794C42.8661 7.16694 43.6031 6.86694 44.4691 6.86694C44.8991 6.86694 45.3101 6.95094 45.7001 7.11794C46.0911 7.28594 46.404 7.50894 46.6381 7.78794L46.111 8.31594C45.714 7.84094 45.167 7.60394 44.468 7.60394C43.836 7.60394 43.29 7.82594 42.829 8.26994C42.368 8.71394 42.1381 9.29094 42.1381 9.99994C42.1381 10.7089 42.368 11.2859 42.829 11.7299C43.29 12.1739 43.836 12.3959 44.468 12.3959C45.138 12.3959 45.6971 12.1729 46.1441 11.7259C46.4341 11.4349 46.602 11.0299 46.647 10.5109H44.468V9.78994H47.375C47.405 9.94694 47.418 10.0979 47.418 10.2429Z"
          fill="white"
        />
        <path
          d="M52.0281 7.737H49.2961V9.639H51.7601V10.36H49.2961V12.262H52.0281V13H48.5251V7H52.0281V7.737Z"
          fill="white"
        />
        <path
          d="M55.279 13H54.508V7.737H52.832V7H56.955V7.737H55.279V13Z"
          fill="white"
        />
        <path d="M59.938 13V7H60.709V13H59.938Z" fill="white" />
        <path
          d="M64.1281 13H63.3572V7.737H61.6812V7H65.8042V7.737H64.1281V13Z"
          fill="white"
        />
        <path
          d="M73.6089 12.225C73.0189 12.831 72.2859 13.134 71.4089 13.134C70.5319 13.134 69.7989 12.831 69.2099 12.225C68.6199 11.619 68.3259 10.877 68.3259 9.99999C68.3259 9.12299 68.6199 8.38099 69.2099 7.77499C69.7989 7.16899 70.5319 6.86499 71.4089 6.86499C72.2809 6.86499 73.0129 7.16999 73.6049 7.77899C74.1969 8.38799 74.4929 9.12799 74.4929 9.99999C74.4929 10.877 74.1979 11.619 73.6089 12.225ZM69.7789 11.722C70.2229 12.172 70.7659 12.396 71.4089 12.396C72.0519 12.396 72.5959 12.171 73.0389 11.722C73.4829 11.272 73.7059 10.698 73.7059 9.99999C73.7059 9.30199 73.4829 8.72799 73.0389 8.27799C72.5959 7.82799 72.0519 7.60399 71.4089 7.60399C70.7659 7.60399 70.2229 7.82899 69.7789 8.27799C69.3359 8.72799 69.1129 9.30199 69.1129 9.99999C69.1129 10.698 69.3359 11.272 69.7789 11.722Z"
          fill="white"
        />
        <path
          d="M75.5749 13V7H76.513L79.429 11.667H79.4619L79.429 10.511V7H80.1999V13H79.3949L76.344 8.106H76.3109L76.344 9.262V13H75.5749Z"
          fill="white"
        />
        <path
          d="M10.4361 7.53803C10.1451 7.84603 9.97314 8.32403 9.97314 8.94303V31.059C9.97314 31.679 10.1451 32.156 10.4361 32.464L10.5101 32.536L22.8991 20.147V20.001V19.855L10.5101 7.46503L10.4361 7.53803Z"
          fill="url(#gp0)"
        />
        <path
          d="M27.0279 24.278L22.8989 20.147V20.001V19.855L27.0289 15.725L27.1219 15.778L32.0149 18.558C33.4119 19.352 33.4119 20.651 32.0149 21.446L27.1219 24.226L27.0279 24.278Z"
          fill="url(#gp1)"
        />
        <path
          d="M27.122 24.225L22.898 20.001L10.436 32.464C10.896 32.952 11.657 33.012 12.514 32.526L27.122 24.225Z"
          fill="url(#gp2)"
        />
        <path
          d="M27.122 15.777L12.514 7.47701C11.657 6.99001 10.896 7.05101 10.436 7.53901L22.899 20.002L27.122 15.777Z"
          fill="url(#gp3)"
        />
        <defs>
          <linearGradient
            gradientUnits="userSpaceOnUse"
            id="gp0"
            x1="21.8009"
            x2="5.01895"
            y1="8.70903"
            y2="25.491"
          >
            <stop stopColor="#00A0FF" />
            <stop offset="0.0066" stopColor="#00A1FF" />
            <stop offset="0.2601" stopColor="#00BEFF" />
            <stop offset="0.5122" stopColor="#00D2FF" />
            <stop offset="0.7604" stopColor="#00DFFF" />
            <stop offset="1" stopColor="#00E3FF" />
          </linearGradient>
          <linearGradient
            gradientUnits="userSpaceOnUse"
            id="gp1"
            x1="33.8334"
            x2="9.63753"
            y1="20.001"
            y2="20.001"
          >
            <stop stopColor="#FFE000" />
            <stop offset="0.4087" stopColor="#FFBD00" />
            <stop offset="0.7754" stopColor="#FFA500" />
            <stop offset="1" stopColor="#FF9C00" />
          </linearGradient>
          <linearGradient
            gradientUnits="userSpaceOnUse"
            id="gp2"
            x1="24.8281"
            x2="2.06964"
            y1="22.2949"
            y2="45.0534"
          >
            <stop stopColor="#FF3A44" />
            <stop offset="1" stopColor="#C31162" />
          </linearGradient>
          <linearGradient
            gradientUnits="userSpaceOnUse"
            id="gp3"
            x1="7.29743"
            x2="17.4597"
            y1="0.176806"
            y2="10.3391"
          >
            <stop stopColor="#32A071" />
            <stop offset="0.0685" stopColor="#2DA771" />
            <stop offset="0.4762" stopColor="#15CF74" />
            <stop offset="0.8009" stopColor="#06E775" />
            <stop offset="1" stopColor="#00F076" />
          </linearGradient>
        </defs>
      </svg>
    </a>
  );
};

const AppStoreButton = ({
  size = "md",
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { size?: "md" | "lg" }) => {
  return (
    <a
      aria-label="Download on the App Store"
      href="#"
      {...props}
      className={cx(
        "rounded-[7px] bg-black ring-1 ring-white/12 ring-inset outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black",
        props.className ?? "",
      )}
    >
      <svg
        fill="none"
        height={size === "md" ? 40 : 44}
        viewBox="0 0 120 40"
        width={size === "md" ? 120 : 132}
      >
        <path
          d="M81.5257 19.2009V21.4919H80.0896V22.9944H81.5257V28.0994C81.5257 29.8425 82.3143 30.5398 84.2981 30.5398C84.6468 30.5398 84.9788 30.4983 85.2693 30.4485V28.9626C85.0203 28.9875 84.8626 29.0041 84.5887 29.0041C83.7005 29.0041 83.3104 28.5891 83.3104 27.6428V22.9944H85.2693V21.4919H83.3104V19.2009H81.5257Z"
          fill="white"
        />
        <path
          d="M90.3232 30.6643C92.9628 30.6643 94.5815 28.8962 94.5815 25.9661C94.5815 23.0525 92.9545 21.2761 90.3232 21.2761C87.6835 21.2761 86.0566 23.0525 86.0566 25.9661C86.0566 28.8962 87.6752 30.6643 90.3232 30.6643ZM90.3232 29.0789C88.7709 29.0789 87.8994 27.9416 87.8994 25.9661C87.8994 24.0071 88.7709 22.8616 90.3232 22.8616C91.8671 22.8616 92.747 24.0071 92.747 25.9661C92.747 27.9333 91.8671 29.0789 90.3232 29.0789Z"
          fill="white"
        />
        <path
          d="M95.9664 30.49H97.7511V25.1526C97.7511 23.8826 98.7056 23.0276 100.059 23.0276C100.374 23.0276 100.905 23.0857 101.055 23.1355V21.3757C100.864 21.3259 100.524 21.301 100.258 21.301C99.0792 21.301 98.0748 21.9485 97.8175 22.8367H97.6846V21.4504H95.9664V30.49Z"
          fill="white"
        />
        <path
          d="M105.486 22.7952C106.806 22.7952 107.669 23.7165 107.711 25.136H103.145C103.245 23.7248 104.166 22.7952 105.486 22.7952ZM107.702 28.0496C107.37 28.7551 106.632 29.1453 105.552 29.1453C104.125 29.1453 103.203 28.1409 103.145 26.5554V26.4558H109.529V25.8332C109.529 22.9944 108.009 21.2761 105.494 21.2761C102.946 21.2761 101.327 23.1106 101.327 25.9993C101.327 28.8879 102.913 30.6643 105.503 30.6643C107.57 30.6643 109.014 29.6682 109.421 28.0496H107.702Z"
          fill="white"
        />
        <path
          d="M69.8221 27.1518C69.9598 29.3715 71.8095 30.7911 74.5626 30.7911C77.505 30.7911 79.3462 29.3027 79.3462 26.9281C79.3462 25.0612 78.2966 24.0287 75.7499 23.4351L74.382 23.0996C72.7645 22.721 72.1106 22.2134 72.1106 21.3272C72.1106 20.2088 73.1259 19.4775 74.6487 19.4775C76.0941 19.4775 77.0921 20.1916 77.2727 21.3358H79.1483C79.0365 19.2452 77.1953 17.774 74.6745 17.774C71.9644 17.774 70.1576 19.2452 70.1576 21.4563C70.1576 23.2802 71.1815 24.3643 73.427 24.8891L75.0272 25.2763C76.6705 25.6634 77.3932 26.2312 77.3932 27.1776C77.3932 28.2789 76.2575 29.079 74.7089 29.079C73.0484 29.079 71.8955 28.3305 71.7321 27.1518H69.8221Z"
          fill="white"
        />
        <path
          d="M51.3348 21.301C50.1063 21.301 49.0437 21.9153 48.4959 22.9446H48.3631V21.4504H46.6448V33.4949H48.4295V29.1204H48.5706C49.0437 30.0749 50.0647 30.6394 51.3514 30.6394C53.6341 30.6394 55.0867 28.8381 55.0867 25.9661C55.0867 23.094 53.6341 21.301 51.3348 21.301ZM50.8284 29.0373C49.3343 29.0373 48.3963 27.8586 48.3963 25.9744C48.3963 24.0818 49.3343 22.9031 50.8367 22.9031C52.3475 22.9031 53.2522 24.0569 53.2522 25.9661C53.2522 27.8835 52.3475 29.0373 50.8284 29.0373Z"
          fill="white"
        />
        <path
          d="M61.3316 21.301C60.103 21.301 59.0405 21.9153 58.4927 22.9446H58.3599V21.4504H56.6416V33.4949H58.4263V29.1204H58.5674C59.0405 30.0749 60.0615 30.6394 61.3482 30.6394C63.6309 30.6394 65.0835 28.8381 65.0835 25.9661C65.0835 23.094 63.6309 21.301 61.3316 21.301ZM60.8252 29.0373C59.3311 29.0373 58.3931 27.8586 58.3931 25.9744C58.3931 24.0818 59.3311 22.9031 60.8335 22.9031C62.3443 22.9031 63.249 24.0569 63.249 25.9661C63.249 27.8835 62.3443 29.0373 60.8252 29.0373Z"
          fill="white"
        />
        <path
          d="M43.4428 30.49H45.4905L41.008 18.0751H38.9346L34.4521 30.49H36.431L37.5752 27.1948H42.3072L43.4428 30.49ZM39.8724 20.3292H40.0186L41.8168 25.5774H38.0656L39.8724 20.3292Z"
          fill="white"
        />
        <path
          d="M35.6514 8.71094V14.7H37.8137C39.5984 14.7 40.6318 13.6001 40.6318 11.6868C40.6318 9.80249 39.5901 8.71094 37.8137 8.71094H35.6514ZM36.5811 9.55762H37.71C38.9509 9.55762 39.6855 10.3462 39.6855 11.6992C39.6855 13.073 38.9634 13.8533 37.71 13.8533H36.5811V9.55762Z"
          fill="white"
        />
        <path
          d="M43.7969 14.7871C45.1167 14.7871 45.9261 13.9031 45.9261 12.438C45.9261 10.9812 45.1126 10.093 43.7969 10.093C42.4771 10.093 41.6636 10.9812 41.6636 12.438C41.6636 13.9031 42.4729 14.7871 43.7969 14.7871ZM43.7969 13.9944C43.0208 13.9944 42.585 13.4258 42.585 12.438C42.585 11.4585 43.0208 10.8857 43.7969 10.8857C44.5689 10.8857 45.0088 11.4585 45.0088 12.438C45.0088 13.4216 44.5689 13.9944 43.7969 13.9944Z"
          fill="white"
        />
        <path
          d="M52.8182 10.1802H51.9259L51.1207 13.6292H51.0501L50.1205 10.1802H49.2655L48.3358 13.6292H48.2694L47.4601 10.1802H46.5553L47.8004 14.7H48.7176L49.6473 11.3713H49.7179L50.6517 14.7H51.5772L52.8182 10.1802Z"
          fill="white"
        />
        <path
          d="M53.8458 14.7H54.7382V12.0562C54.7382 11.3506 55.1574 10.9106 55.8173 10.9106C56.4772 10.9106 56.7926 11.2717 56.7926 11.998V14.7H57.685V11.7739C57.685 10.699 57.1288 10.093 56.1203 10.093C55.4396 10.093 54.9914 10.396 54.7714 10.8982H54.705V10.1802H53.8458V14.7Z"
          fill="white"
        />
        <path d="M59.0903 14.7H59.9826V8.41626H59.0903V14.7Z" fill="white" />
        <path
          d="M63.3386 14.7871C64.6584 14.7871 65.4678 13.9031 65.4678 12.438C65.4678 10.9812 64.6543 10.093 63.3386 10.093C62.0188 10.093 61.2053 10.9812 61.2053 12.438C61.2053 13.9031 62.0146 14.7871 63.3386 14.7871ZM63.3386 13.9944C62.5625 13.9944 62.1267 13.4258 62.1267 12.438C62.1267 11.4585 62.5625 10.8857 63.3386 10.8857C64.1106 10.8857 64.5505 11.4585 64.5505 12.438C64.5505 13.4216 64.1106 13.9944 63.3386 13.9944Z"
          fill="white"
        />
        <path
          d="M68.1265 14.0234C67.6409 14.0234 67.2881 13.7869 67.2881 13.3801C67.2881 12.9817 67.5704 12.77 68.1929 12.7285L69.2969 12.658V13.0356C69.2969 13.5959 68.7989 14.0234 68.1265 14.0234ZM67.8982 14.7747C68.4917 14.7747 68.9856 14.5173 69.2554 14.0649H69.326V14.7H70.1851V11.6121C70.1851 10.6575 69.5459 10.093 68.4129 10.093C67.3877 10.093 66.6573 10.5911 66.566 11.3672H67.4292C67.5289 11.0476 67.8733 10.865 68.3714 10.865C68.9815 10.865 69.2969 11.1348 69.2969 11.6121V12.0022L68.0726 12.0728C66.9976 12.1392 66.3916 12.6082 66.3916 13.4216C66.3916 14.2476 67.0267 14.7747 67.8982 14.7747Z"
          fill="white"
        />
        <path
          d="M73.2132 14.7747C73.8358 14.7747 74.3629 14.48 74.6327 13.9861H74.7032V14.7H75.5582V8.41626H74.6659V10.8982H74.5995C74.3546 10.4001 73.8316 10.1055 73.2132 10.1055C72.0719 10.1055 71.3373 11.0103 71.3373 12.438C71.3373 13.8699 72.0636 14.7747 73.2132 14.7747ZM73.4664 10.9065C74.2135 10.9065 74.6825 11.5 74.6825 12.4421C74.6825 13.3884 74.2176 13.9736 73.4664 13.9736C72.711 13.9736 72.2586 13.3967 72.2586 12.438C72.2586 11.4875 72.7152 10.9065 73.4664 10.9065Z"
          fill="white"
        />
        <path
          d="M81.3447 14.7871C82.6645 14.7871 83.4738 13.9031 83.4738 12.438C83.4738 10.9812 82.6604 10.093 81.3447 10.093C80.0249 10.093 79.2114 10.9812 79.2114 12.438C79.2114 13.9031 80.0207 14.7871 81.3447 14.7871ZM81.3447 13.9944C80.5686 13.9944 80.1328 13.4258 80.1328 12.438C80.1328 11.4585 80.5686 10.8857 81.3447 10.8857C82.1166 10.8857 82.5566 11.4585 82.5566 12.438C82.5566 13.4216 82.1166 13.9944 81.3447 13.9944Z"
          fill="white"
        />
        <path
          d="M84.655 14.7H85.5474V12.0562C85.5474 11.3506 85.9666 10.9106 86.6265 10.9106C87.2864 10.9106 87.6018 11.2717 87.6018 11.998V14.7H88.4941V11.7739C88.4941 10.699 87.938 10.093 86.9294 10.093C86.2488 10.093 85.8005 10.396 85.5806 10.8982H85.5142V10.1802H84.655V14.7Z"
          fill="white"
        />
        <path
          d="M92.6039 9.05542V10.2009H91.8858V10.9521H92.6039V13.5046C92.6039 14.3762 92.9981 14.7249 93.9901 14.7249C94.1644 14.7249 94.3304 14.7041 94.4757 14.6792V13.9363C94.3512 13.9487 94.2723 13.957 94.1353 13.957C93.6913 13.957 93.4962 13.7495 93.4962 13.2764V10.9521H94.4757V10.2009H93.4962V9.05542H92.6039Z"
          fill="white"
        />
        <path
          d="M95.6735 14.7H96.5658V12.0603C96.5658 11.3755 96.9726 10.9148 97.703 10.9148C98.3339 10.9148 98.6701 11.28 98.6701 12.0022V14.7H99.5624V11.7822C99.5624 10.7073 98.9689 10.0972 98.006 10.0972C97.3253 10.0972 96.848 10.4001 96.6281 10.9065H96.5575V8.41626H95.6735V14.7Z"
          fill="white"
        />
        <path
          d="M102.781 10.8525C103.441 10.8525 103.873 11.3132 103.894 12.0229H101.611C101.661 11.3174 102.122 10.8525 102.781 10.8525ZM103.89 13.4797C103.724 13.8325 103.354 14.0276 102.815 14.0276C102.101 14.0276 101.64 13.5254 101.611 12.7327V12.6829H104.803V12.3716C104.803 10.9521 104.043 10.093 102.786 10.093C101.511 10.093 100.702 11.0103 100.702 12.4546C100.702 13.8989 101.495 14.7871 102.79 14.7871C103.823 14.7871 104.545 14.2891 104.749 13.4797H103.89Z"
          fill="white"
        />
        <path
          d="M24.769 20.3008C24.7907 18.6198 25.6934 17.0292 27.1256 16.1488C26.2221 14.8584 24.7088 14.0403 23.1344 13.9911C21.4552 13.8148 19.8272 14.9959 18.9715 14.9959C18.0992 14.9959 16.7817 14.0086 15.363 14.0378C13.5137 14.0975 11.7898 15.1489 10.8901 16.7656C8.95607 20.1141 10.3987 25.0351 12.2513 27.7417C13.1782 29.0671 14.2615 30.5475 15.6789 30.495C17.066 30.4375 17.584 29.6105 19.2583 29.6105C20.9171 29.6105 21.4031 30.495 22.8493 30.4616C24.3377 30.4375 25.2754 29.1304 26.1698 27.7925C26.8358 26.8481 27.3483 25.8044 27.6882 24.7C25.9391 23.9602 24.771 22.2 24.769 20.3008Z"
          fill="white"
        />
        <path
          d="M22.0373 12.2111C22.8489 11.2369 23.2487 9.98469 23.1518 8.72046C21.912 8.85068 20.7668 9.44324 19.9443 10.3801C19.14 11.2954 18.7214 12.5255 18.8006 13.7415C20.0408 13.7542 21.2601 13.1777 22.0373 12.2111Z"
          fill="white"
        />
      </svg>
    </a>
  );
};

const Landing = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const globeContainerRef = useRef<HTMLDivElement>(null);
  const overlayRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const basePhiRef = useRef(GLOBE_INITIAL_PHI);
  const [locale, setLocale] = useState<LandingLocale>("ru");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [demoName, setDemoName] = useState("");
  const [demoEmail, setDemoEmail] = useState("");
  const [demoPhone, setDemoPhone] = useState("");
  const [demoTermsAccepted, setDemoTermsAccepted] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const isDemoFormValid =
    demoName.trim().length > 0 &&
    (demoEmail.trim().length > 0 || demoPhone.trim().length > 0) &&
    demoTermsAccepted;

  const firstFeatureRowShift = { "--feature-row-offset": "-280px" } as CSSProperties;
  const secondFeatureRowShift = { "--feature-row-offset": "280px" } as CSSProperties;
  const thirdFeatureRowShift = { "--feature-row-offset": "-280px" } as CSSProperties;

  const setOverlayRef = (id: string) => (node: HTMLDivElement | null) => {
    overlayRefs.current[id] = node;
  };

  useEffect(() => {
    setIsMounted(true);
    const savedLocale = window.localStorage.getItem("smart-admin-locale");
    if (savedLocale === "en" || savedLocale === "ru") {
      setLocale(savedLocale);
    }

    const syncLocale = () => {
      const nextLocale = window.localStorage.getItem("smart-admin-locale");
      setLocale(nextLocale === "en" ? "en" : "ru");
    };

    window.addEventListener("storage", syncLocale);
    window.addEventListener("focus", syncLocale);

    return () => {
      window.removeEventListener("storage", syncLocale);
      window.removeEventListener("focus", syncLocale);
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !globeContainerRef.current) return;

    const canvas = canvasRef.current;
    const globeContainer = globeContainerRef.current;
    const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    let globeSize = Math.max(globeContainer.offsetWidth * devicePixelRatio, 1);
    let frameId = 0;

    const syncOverlays = (currentPhi: number) => {
      const rect = globeContainer.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      for (const item of GLOBE_OVERLAY_ITEMS) {
        const node = overlayRefs.current[item.id];
        if (!node) continue;

        const projection = projectGlobeLocation(
          item.location,
          currentPhi,
          GLOBE_THETA,
          rect.width,
          rect.height,
          GLOBE_SCALE,
        );
        const depthLayer = 200 + Math.round((projection.depth + 1) * 100);
        node.style.zIndex = String(depthLayer);

        if (item.type === "chip") {
          const isVisible = projection.visibility > 0.45;
          const wasVisible = node.dataset.bouncing === "true";
          if (isVisible && !wasVisible) {
            node.dataset.bouncing = "false";
            void node.offsetWidth;
            node.dataset.bouncing = "true";
          } else if (!isVisible && wasVisible) {
            node.dataset.bouncing = "false";
          }
        }
      }
    };

    const globe = createGlobe(canvas, {
      devicePixelRatio,
      width: globeSize,
      height: globeSize,
      phi: basePhiRef.current,
      theta: GLOBE_THETA,
      dark: 0,
      diffuse: 0.2,
      mapSamples: 24000,
      mapBrightness: 7,
      mapBaseBrightness: 0,
      scale: GLOBE_SCALE,
      baseColor: GLOBE_BASE_COLOR,
      markerColor: LANDING_PRIMARY_COBE_RGB,
      glowColor: [0.98, 0.99, 1],
      offset: [0, 0],
      markerElevation: 0,
      markers: GLOBE_OVERLAY_ITEMS.filter(
        (item) => item.id !== "berlin-face",
      ).map((item) => ({
        location: item.location,
        size: item.size,
        id: item.id,
      })),
    });

    const resizeObserver = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const nextGlobeSize = Math.max(
        entry.contentRect.width * devicePixelRatio,
        1,
      );
      if (Math.abs(nextGlobeSize - globeSize) < 1) return;
      globeSize = nextGlobeSize;
      globe.update({ width: globeSize, height: globeSize });
      syncOverlays(basePhiRef.current);
    });

    resizeObserver.observe(globeContainer);

    const animate = () => {
      basePhiRef.current += GLOBE_ROTATION_STEP;
      const phi = basePhiRef.current;
      globe.update({ phi, width: globeSize, height: globeSize });
      syncOverlays(phi);
      frameId = window.requestAnimationFrame(animate);
    };

    syncOverlays(basePhiRef.current);
    canvas.style.opacity = "1";
    frameId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      globe.destroy();
    };
  }, []);

  useEffect(() => {
    const syncHeaderState = () => {
      setIsHeaderScrolled(window.scrollY > 12);
    };

    syncHeaderState();
    window.addEventListener("scroll", syncHeaderState, { passive: true });

    return () => {
      window.removeEventListener("scroll", syncHeaderState);
    };
  }, []);

  const webFeatures = [
    {
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
          />
        </svg>
      ),
      title: "Каталог сотрудников",
      desc: "Управляйте профилями, группами и графиками работы в одном месте",
    },
    {
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
          />
        </svg>
      ),
      title: "Аналитика посещаемости",
      desc: "Следите за опозданиями, ранними уходами и аномалиями по дням",
    },
    {
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
          />
        </svg>
      ),
      title: "Биометрический контроль",
      desc: "Проверяйте историю распознаваний, точность и liveness-проверки",
    },
    {
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
          />
        </svg>
      ),
      title: "Управление задачами",
      desc: "Доски задач, шаблоны, автоматизация и аналитика по группам",
    },
    {
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
          />
        </svg>
      ),
      title: "Расчёт зарплат",
      desc: "Экспортируйте данные в Excel, PDF — всё рассчитается автоматически",
    },
    {
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
          />
          <path
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
          />
        </svg>
      ),
      title: "Настройка организации",
      desc: "Геозоны, логотип, адрес, timezone — полный контроль над компанией",
    },
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "Бесплатно",
      period: "",
      desc: "Для небольших команд до 10 человек",
      features: [
        "До 10 сотрудников",
        "Распознавание лиц",
        "Базовые отчёты",
        "Мобильное приложение",
      ],
      highlighted: false,
    },
    {
      name: "Business",
      price: "$4",
      period: "/ сотрудник в месяц",
      desc: "Для растущих компаний",
      features: [
        "Неограниченно сотрудников",
        "Веб-панель управления",
        "Аналитика и экспорт",
        "Payroll",
        "Приоритетная поддержка",
      ],
      highlighted: true,
    },
    {
      name: "Enterprise",
      price: "По запросу",
      period: "",
      desc: "Индивидуальные решения для крупного бизнеса",
      features: [
        "Всё из Business",
        "Выделенный менеджер",
        "SLA 99.9%",
        "On-premise установка",
        "API доступ",
      ],
      highlighted: false,
    },
  ];

  const faqs = [
    {
      q: "Как работает распознавание лиц?",
      a: "Сотрудник открывает приложение, сканирует лицо камерой — система автоматически проверяет личность и фиксирует время. Точность распознавания — 99.8%.",
    },
    {
      q: "Нужно ли специальное оборудование?",
      a: "Нет. Достаточно обычного смартфона с камерой. Наше приложение работает на iOS и Android.",
    },
    {
      q: "Как обеспечивается безопасность данных?",
      a: "Все биометрические данные шифруются end-to-end. Серверы расположены в защищённых дата-центрах. Соответствие GDPR.",
    },
    {
      q: "Есть ли пробный период?",
      a: "Да, план Starter бесплатен навсегда для команд до 10 человек. Для Business-плана доступна 30-дневная пробная версия.",
    },
  ];

  return (
    <div className="landing-shell min-h-screen bg-background">
      <header className="fixed inset-x-0 top-0 z-50 pointer-events-none">
        <div
          className={cx(
            "mx-auto w-full transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-auto transform-gpu",
            isHeaderScrolled
              ? "max-w-[100vw] mt-0 rounded-b-2xl bg-white/50 border-b border-white/60 shadow-[0px_10px_40px_5px_rgba(194,194,194,0.25)] backdrop-blur-xl px-6 py-4 md:px-16 lg:px-24"
              : "max-w-5xl mt-6 rounded-[40px] bg-white/50 border border-white/60 shadow-[0px_10px_40px_5px_rgba(194,194,194,0.25)] backdrop-blur-xl px-8 py-3 md:px-12 lg:px-16"
          )}
        >
          <div className="flex w-full items-center justify-between">
            <button
              className="flex items-center"
              onClick={() =>
                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                })
              }
              type="button"
            >
              <BrandWordmark className="text-[1.95rem] text-foreground" />
            </button>

            <nav className="hidden items-center gap-8 md:flex">
              {["Продукт", "Возможности", "Цены", "О нас"].map((item) => (
                <a
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  href="#"
                  key={item}
                >
                  {item}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <a
                className="hidden text-sm font-medium text-foreground transition-colors hover:text-primary sm:inline-block"
                href="/login"
              >
                Войти
              </a>
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-white! transition-opacity hover:opacity-90"
                onClick={() => setIsDemoModalOpen(true)}
              >
                Начать
              </button>
            </div>
          </div>
        </div>
      </header>

      <section
        className="relative min-h-[95vh] overflow-hidden px-6 pb-10 pt-24 md:px-16 md:pb-16 md:pt-28 lg:px-24"
        style={{
          background: "linear-gradient(180deg, #f5f7fc 0%, #eef3fb 100%)",
        }}
      >
        {/* Background Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 z-0 size-full object-cover opacity-60 mix-blend-multiply transition-opacity duration-1000"
          style={{ transform: "scale(-1, -1)" }}
          src="/hero.webm"
        />
        <div
          className={cx(
            "lp-hero-petersburg mx-auto flex relative z-10 min-h-[calc(95vh-6rem)] max-w-7xl flex-col items-center justify-start gap-10 pt-8 lg:flex-row lg:gap-2 lg:pt-2",
            petersburgHero.className,
          )}
        >
          <div className="max-w-xl flex-1 lg:max-w-[38rem] lg:flex-[1.1]">
            <h1 className="mb-10 animate-[fadeInUp_0.6s_0.15s_ease_forwards] flex flex-col text-[clamp(2rem,5vw,3.4rem)] leading-[1.05] tracking-[-0.05em] font-medium uppercase text-foreground opacity-0">
              <span className="text-[clamp(4rem,10vw,6.8rem)] leading-[0.9] font-medium tracking-[-0.06em]">ВСЯ</span>
              <span>работа команды</span>
              <span>на одном экране</span>
            </h1>
            <div className="flex gap-10 animate-[fadeInUp_0.6s_0.45s_ease_forwards] opacity-0">
              {[
                { value: "99.8%", label: "Точность распознавания" },
                { value: "500+", label: "Компаний доверяют" },
                { value: "24/7", label: "Поддержка" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl font-bold text-foreground">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-14 animate-[fadeInUp_0.6s_0.6s_ease_forwards] opacity-0">
              <button
                type="button"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-base font-semibold text-white! shadow-lg shadow-primary/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30"
                onClick={() => setIsDemoModalOpen(true)}
              >
                Заказать демо
                <svg
                  className="ml-2 h-4 w-4 text-white!"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex flex-1 justify-center opacity-0 animate-[fadeIn_1s_0.4s_ease_forwards] lg:flex-[0.9] lg:translate-x-24 lg:justify-end">
            <div className="relative isolate h-[360px] w-[360px] md:h-[520px] md:w-[520px] lg:h-[620px] lg:w-[620px]">
              <div className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.14)_0%,rgba(255,255,255,0)_68%)] blur-3xl" />
              <div className="absolute inset-[11%] rounded-full bg-white/78 shadow-[0_36px_120px_rgba(148,163,184,0.18)]" />
              <div className="absolute inset-[11%] rounded-full shadow-[inset_-30px_-36px_80px_rgba(148,163,184,0.18)] ring-1 ring-white/90" />
              <div className="relative size-full" ref={globeContainerRef}>
                <canvas
                  className="relative z-10 h-full w-full opacity-0 transition-opacity duration-700 [contain:layout_paint_size]"
                  ref={canvasRef}
                  style={{ maxWidth: "100%", aspectRatio: "1" }}
                />
                {GLOBE_OVERLAY_ITEMS.map((item) =>
                  item.type === "polaroid" ? (
                    <GlobePolaroidCard
                      item={item}
                      key={item.id}
                      overlayRef={setOverlayRef(item.id)}
                    />
                  ) : (
                    <GlobeStatusChip
                      item={item}
                      key={item.id}
                      overlayRef={setOverlayRef(item.id)}
                    />
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-12 overflow-hidden bg-primary py-16 sm:gap-16 md:gap-20 md:py-24 lg:gap-24">
        <div className="mx-auto w-full max-w-7xl px-6 md:px-16 lg:px-24">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
            <h2 className="mt-3 text-[clamp(1.75rem,4vw,3rem)] leading-[1.1] tracking-[-0.04em] font-medium uppercase text-white !font-sans">
              <span className="whitespace-nowrap">Удобные <span className="italic">контроль и аналитика</span></span>
              <br className="hidden md:block" />
              <span className="whitespace-nowrap">для операционной деятельности</span>
            </h2>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-6 sm:gap-16 md:gap-20 md:px-16 lg:gap-24 lg:px-24">
          <div
            className="grid grid-cols-1 gap-10 md:gap-20 lg:relative lg:left-[var(--feature-row-offset)] lg:grid-cols-2 lg:gap-24"
            style={firstFeatureRowShift}
          >
            <div className="max-w-xl flex-1 self-center">
              <FeatureBadge
                description="Веб-интерфейс собирает рабочие диалоги, объявления и уведомления в единый поток для команды и менеджеров."
                icon={<MessageChatCircle className="h-6 w-6" />}
                title="Коммуникации и общие inbox-потоки"
              />
              <ul className="mt-8 flex flex-col gap-4 pl-2 md:gap-5 md:pl-4">
                {[
                  "Единый канал объявлений и внутренних сообщений",
                  "Быстрый доступ к чатам команды и сотрудникам",
                  "Меньше потерь контекста между HR и менеджерами",
                ].map((feat) => (
                  <CheckItemText key={feat} text={feat} />
                ))}
              </ul>
            </div>

            <div className="relative w-full flex-1 lg:h-[32rem]">
              <AlternateImageMockup className="lg:left-0">
                <img
                  alt="Dashboard mockup showing application interface"
                  className="size-full object-contain lg:w-auto lg:max-w-none dark:hidden"
                  src={getLandingMockupSrc(1, locale)}
                />
                <img
                  alt="Dashboard mockup showing application interface"
                  className="size-full object-contain not-dark:hidden lg:w-auto lg:max-w-none"
                  src={getLandingMockupSrc(1, locale)}
                />
              </AlternateImageMockup>
            </div>
          </div>

          <div
            className="grid grid-cols-1 gap-10 md:gap-20 lg:relative lg:left-[var(--feature-row-offset)] lg:grid-cols-2 lg:gap-24"
            style={secondFeatureRowShift}
          >
            <div className="max-w-xl flex-1 self-center lg:order-last">
              <FeatureBadge
                description="Ключевые сценарии работают быстро: attendance, заявки, payroll, шаблоны задач и операционные процессы."
                icon={<ZapFast className="h-6 w-6" />}
                title="Скорость операционных решений"
              />
              <ul className="mt-8 flex flex-col gap-4 pl-2 md:gap-5 md:pl-4">
                {[
                  "Мгновенная навигация по основным admin-модулям",
                  "Сценарии без ручной склейки между системами",
                  "Быстрые действия для HR, managers и operations",
                ].map((feat) => (
                  <CheckItemText key={feat} text={feat} />
                ))}
              </ul>
            </div>

            <div className="relative w-full flex-1 lg:h-[32rem]">
              <AlternateImageMockup className="lg:right-0">
                <img
                  alt="Dashboard mockup showing application interface"
                  className="size-full object-contain lg:w-auto lg:max-w-none dark:hidden"
                  src={getLandingMockupSrc(2, locale)}
                />
                <img
                  alt="Dashboard mockup showing application interface"
                  className="size-full object-contain not-dark:hidden lg:w-auto lg:max-w-none"
                  src={getLandingMockupSrc(2, locale)}
                />
              </AlternateImageMockup>
            </div>
          </div>

          <div
            className="grid grid-cols-1 gap-10 md:gap-20 lg:relative lg:left-[var(--feature-row-offset)] lg:grid-cols-2 lg:gap-24"
            style={thirdFeatureRowShift}
          >
            <div className="max-w-xl flex-1 self-center">
              <FeatureBadge
                description="Отчёты и drilldown помогают быстро понять, что происходит с командой, attendance и эффективностью."
                icon={<ChartBreakoutSquare className="h-6 w-6" />}
                title="Управление командой через аналитику"
              />
              <ul className="mt-8 flex flex-col gap-4 pl-2 md:gap-5 md:pl-4">
                {[
                  "Фильтрация, отчёты и быстрый экспорт нужных данных",
                  "Сохранение операционных выводов в одном месте",
                  "Основа для решений по людям, процессам и payroll",
                ].map((feat) => (
                  <CheckItemText key={feat} text={feat} />
                ))}
              </ul>
            </div>

            <div className="relative w-full flex-1 lg:h-[32rem]">
              <AlternateImageMockup className="lg:left-0">
                <img
                  alt="Dashboard mockup showing application interface"
                  className="size-full object-contain lg:w-auto lg:max-w-none dark:hidden"
                  src={getLandingMockupSrc(3, locale)}
                />
                <img
                  alt="Dashboard mockup showing application interface"
                  className="size-full object-contain not-dark:hidden lg:w-auto lg:max-w-none"
                  src={getLandingMockupSrc(3, locale)}
                />
              </AlternateImageMockup>
            </div>
          </div>
        </div>
      </section>

      <section
        className="px-6 py-20 md:px-16 md:py-32 lg:px-24"
        style={{
          background: "linear-gradient(180deg, #f5f7fc 0%, #eef3fb 100%)",
        }}
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-16 lg:flex-row lg:gap-20">
          <div className="max-w-lg flex-1">
            <h2 className="mb-6 text-[clamp(1.75rem,4vw,2.8rem)] leading-[1.1] tracking-[-0.05em] font-medium uppercase text-foreground !font-sans">
              {locale === "ru" ? (
                <>
                  <span className="italic">Управляйте</span>
                  <br />
                  командой
                  <br />
                  прямо с
                  <br />
                  <span className="italic">телефона</span>
                </>
              ) : (
                <>
                  <span className="italic">Manage</span>
                  <br />
                  your team
                  <br />
                  right from
                  <br />
                  your <span className="italic">phone</span>
                </>
              )}
            </h2>
            <p className="mb-8 text-lg leading-relaxed text-muted-foreground">
              {locale === "ru"
                ? "Сотрудники начинают и завершают смену одним касанием — с автоматическим распознаванием лица и проверкой геолокации. Никаких бумажных журналов."
                : "Employees start and end their shifts with a single touch — with automatic facial recognition and geolocation checks. No paper logs."}
            </p>
            <div className="space-y-4">
              {(locale === "ru"
                ? [
                  "Сканирование лица за 2 секунды",
                  "Автоматическая проверка местоположения",
                  "Создание задач и запросов на ходу",
                ]
                : [
                  "Face scan in 2 seconds",
                  "Automatic location verification",
                  "Create tasks and requests on the go",
                ]
              ).map((feature) => (
                <div className="flex items-center gap-3" key={feature}>
                  <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <svg
                      className="h-3 w-3 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M5 13l4 4L19 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                      />
                    </svg>
                  </div>
                  <span className="text-sm text-foreground">{feature}</span>
                </div>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap gap-3">
              <AppStoreButton />
              <GooglePlayButton />
            </div>
          </div>

          <div className="flex flex-1 justify-center lg:justify-end">
            <div className="relative">
              {/* Padding bezel keeps inner aspect ratio; uniform border shrinks width more than height vs outer frame */}
              <div className="relative rounded-[3rem] bg-foreground/90 p-2 shadow-2xl shadow-primary/10">
                <div className="absolute top-0 left-1/2 z-20 h-[28px] w-[120px] -translate-x-1/2 rounded-b-2xl bg-foreground/90" />
                <div className="relative aspect-[9/19.5] w-[247px] overflow-hidden rounded-[2.5rem] bg-background md:w-[266px]">
                  <img
                    alt={locale === "ru" ? "Скриншот приложения" : "App screenshot"}
                    className="h-full w-full object-cover object-top"
                    src={locale === "ru" ? "/mob_ru.webp" : "/mob_en.webp"}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="px-6 py-20 md:px-16 md:py-32 lg:px-24"
        style={{ background: "#2f63ff" }}
      >
        <div className="mx-auto max-w-3xl">
          <div className="mb-16 text-center">
            <p className="mb-4 text-sm font-medium tracking-wide text-white/72">
              FAQ
            </p>
            <h2 className="text-3xl leading-tight font-bold tracking-tight text-white md:text-4xl">
              Частые вопросы
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                className="overflow-hidden rounded-2xl border border-white/70 bg-white transition-all duration-300 hover:border-white"
                key={i}
              >
                <button
                  className="flex w-full items-center justify-between p-5 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  type="button"
                >
                  <span className="pr-4 text-sm font-medium text-foreground">
                    {faq.q}
                  </span>
                  <svg
                    className={`h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform duration-300 ${openFaq === i ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M19 9l-7 7-7-7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${openFaq === i ? "max-h-48 pb-5" : "max-h-0"}`}
                >
                  <p className="px-5 text-sm leading-relaxed text-muted-foreground">
                    {faq.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="px-6 py-20 md:px-16 md:py-32 lg:px-24"
        style={{
          background: "linear-gradient(180deg, #f5f7fc 0%, #eef3fb 100%)",
        }}
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <p className="mb-4 text-sm font-medium tracking-wide text-primary">
              Тарифы
            </p>
            <h2 className="mb-6 text-3xl leading-tight font-bold tracking-tight text-foreground md:text-4xl">
              Простые и прозрачные цены
            </h2>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Начните бесплатно, масштабируйте по мере роста команды
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
            {pricingPlans.map((plan) => (
              <div
                className={`relative flex flex-col rounded-2xl border p-8 transition-all duration-300 ${plan.highlighted
                  ? "scale-[1.03] border-primary bg-primary text-primary-foreground shadow-2xl shadow-primary/20"
                  : "border-border/60 bg-background hover:border-primary/20 hover:shadow-lg"
                  }`}
                key={plan.name}
              >
                {plan.highlighted && (
                  <span className="absolute top-[-0.75rem] left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                    Популярный
                  </span>
                )}
                <h3 className="mb-2 text-lg font-semibold">{plan.name}</h3>
                <p
                  className={`mb-6 text-sm ${plan.highlighted ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                >
                  {plan.desc}
                </p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && (
                    <span
                      className={`ml-1 text-sm ${plan.highlighted ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                    >
                      {plan.period}
                    </span>
                  )}
                </div>
                <ul className="mb-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      className="flex items-center gap-2 text-sm"
                      key={feature}
                    >
                      <svg
                        className={`h-4 w-4 flex-shrink-0 ${plan.highlighted ? "text-primary-foreground" : "text-primary"}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M5 13l4 4L19 7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={`mt-auto block w-full rounded-xl py-3 text-center text-sm font-semibold transition-all duration-300 ${plan.highlighted
                    ? "bg-background text-black!"
                    : "bg-primary/10 text-primary hover:bg-primary hover:text-white!"
                    }`}
                  onClick={() => setIsDemoModalOpen(true)}
                >
                  {plan.name === "Enterprise" ? "Связаться" : "Начать"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="px-6 py-20 md:px-16 md:py-28 lg:px-24"
        style={{
          background: "linear-gradient(180deg, #f5f7fc 0%, #eef3fb 100%)",
        }}
      >
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-6 text-3xl leading-tight font-bold tracking-tight text-foreground md:text-4xl">
            Готовы начать?
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Присоединяйтесь к 500+ компаниям, которые уже автоматизировали
            управление персоналом с HiTeam
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <button
              type="button"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-base font-semibold text-white! shadow-lg shadow-primary/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30"
              onClick={() => setIsDemoModalOpen(true)}
            >
              Попробовать бесплатно
            </button>
            <button
              type="button"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-border px-8 text-base font-medium text-foreground transition-all duration-300 hover:border-primary/30 hover:text-primary"
              onClick={() => setIsDemoModalOpen(true)}
            >
              Заказать демо
            </button>
          </div>
        </div>
      </section>

      <footer
        className="border-t border-border/40 px-6 py-12 md:px-16 lg:px-24"
        style={{
          background: "linear-gradient(180deg, #f5f7fc 0%, #eef3fb 100%)",
        }}
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <div className="mb-4 flex items-center">
                <BrandWordmark className="text-[1.95rem] text-foreground" />
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Современная платформа для управления персоналом и контроля
                посещаемости
              </p>
            </div>
            {[
              {
                title: "Продукт",
                links: ["Возможности", "Цены", "Интеграции", "API"],
              },
              {
                title: "Компания",
                links: ["О нас", "Блог", "Карьера", "Контакты"],
              },
              {
                title: "Поддержка",
                links: [
                  "Документация",
                  "Статус",
                  "Обратная связь",
                  "Безопасность",
                ],
              },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="mb-4 text-sm font-semibold text-foreground">
                  {col.title}
                </h4>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                        href="#"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center justify-between border-t border-border/40 pt-8 md:flex-row">
            <p className="text-xs text-muted-foreground">
              © 2026 HiTeam. Все права защищены.
            </p>
            <div className="mt-4 flex gap-6 md:mt-0">
              {["Политика конфиденциальности", "Условия использования"].map(
                (link) => (
                  <a
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                    href="#"
                    key={link}
                  >
                    {link}
                  </a>
                ),
              )}
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes polaroidFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-6px) rotate(0.5deg); }
          75% { transform: translateY(4px) rotate(-0.5deg); }
        }
        @keyframes shimmer {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
          50% { box-shadow: 0 0 20px 4px rgba(59, 130, 246, 0.15); }
        }
        @keyframes bounceTextBadge {
          0%, 70% { transform: translateY(0%); }
          80% { transform: translateY(-15%); }
          90% { transform: translateY(0%); }
          95% { transform: translateY(-7%); }
          97% { transform: translateY(0%); }
          99% { transform: translateY(-3%); }
          100% { transform: translateY(0); }
        }
        .globe-shimmer-text {
          background: linear-gradient(
            90deg,
            currentColor 0%,
            currentColor 40%,
            rgba(255,255,255,0.9) 50%,
            currentColor 60%,
            currentColor 100%
          );
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s ease-in-out infinite;
        }
        .globe-chip-pulse {
          animation: pulseGlow 3s ease-in-out infinite;
        }
        [data-bouncing="true"] .globe-chip-pulse {
          animation: pulseGlow 3s ease-in-out infinite, bounceTextBadge 2s ease forwards;
        }
        .globe-polaroid-glow {
          transition: box-shadow 0.3s ease;
        }
      `}</style>

      <Dialog open={isDemoModalOpen} onOpenChange={setIsDemoModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="text-2xl font-bold text-center">
              {locale === "ru" ? "Заказать демо" : "Get demo"}
            </DialogTitle>
            <DialogDescription className="text-base text-center">
              {locale === "ru"
                ? "Оставьте свои контакты, и мы скоро свяжемся с вами"
                : "Leave your contacts and we will get back to you shortly"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Input
                id="name"
                placeholder={locale === "ru" ? "Ваше имя" : "Your name"}
                className="h-12"
                value={demoName}
                onChange={(e) => setDemoName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Input
                id="email"
                type="email"
                placeholder={locale === "ru" ? "Ваш email" : "Your email"}
                className="h-12"
                value={demoEmail}
                onChange={(e) => setDemoEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Input
                id="phone"
                type="tel"
                placeholder={locale === "ru" ? "Номер телефона (+...)" : "Phone number (+...)"}
                className="h-12"
                value={demoPhone}
                onChange={(e) => setDemoPhone(e.target.value)}
              />
            </div>
            <div className="flex items-start space-x-3 mt-2">
              <Checkbox
                id="terms"
                className="mt-1"
                checked={demoTermsAccepted}
                onCheckedChange={(checked) => setDemoTermsAccepted(checked === true)}
              />
              <label
                htmlFor="terms"
                className="text-sm text-muted-foreground leading-snug cursor-pointer text-left"
              >
                {locale === "ru" ? (
                  <>
                    Я даю согласие на обработку персональных данных и подтверждаю, что ознакомлен с{" "}
                    <a href="#" className="underline hover:text-primary">Политикой конфиденциальности</a>.
                  </>
                ) : (
                  <>
                    I consent to the processing of personal data and confirm that I have read the{" "}
                    <a href="#" className="underline hover:text-primary">Privacy Policy</a>.
                  </>
                )}
              </label>
            </div>
          </div>
          <Button
            type="button"
            className="w-full h-12 text-base mt-2"
            disabled={!isDemoFormValid}
          >
            {locale === "ru" ? "Заказать демо" : "Request demo"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const LandingPage = Landing;
export default Landing;
