'use client';

import { useEffect, useMemo, useState } from 'react';
import AdvantagesFramerComponent from '../../../example-unframer-app/src/framer/advantages';
import BrandingCardFramerComponent from '../../../example-unframer-app/src/framer/branding-card';
import ButtonFramerComponent from '../../../example-unframer-app/src/framer/button';
import CallUsCardFramerComponent from '../../../example-unframer-app/src/framer/call-us-card';
import CaptionButtonFramerComponent from '../../../example-unframer-app/src/framer/caption-button';
import CmsCardFramerComponent from '../../../example-unframer-app/src/framer/cms-card';
import DataVisualiseProFramerComponent from '../../../example-unframer-app/src/framer/data-visualise-pro';
import FaqCardFramerComponent from '../../../example-unframer-app/src/framer/faq-card';
import FeaturesCardFramerComponent from '../../../example-unframer-app/src/framer/features-card';
import FooterAndCtaFramerComponent from '../../../example-unframer-app/src/framer/footer-and-cta';
import HowItSWorkCardFramerComponent from '../../../example-unframer-app/src/framer/how-it-s-work-card';
import NavFramerComponent from '../../../example-unframer-app/src/framer/nav';
import OurMissionFramerComponent from '../../../example-unframer-app/src/framer/our-mission';
import OurPartnersLogoFramerComponent from '../../../example-unframer-app/src/framer/our-partners-logo';
import OurPricingFramerComponent from '../../../example-unframer-app/src/framer/our-pricing';
import PickYourPlanFramerComponent from '../../../example-unframer-app/src/framer/pick-your-plan';
import SocialMediaFramerComponent from '../../../example-unframer-app/src/framer/social-media';
import TeamCardFramerComponent from '../../../example-unframer-app/src/framer/team-card';
import TestimonialCardFramerComponent from '../../../example-unframer-app/src/framer/testimonial-card';

export type FramerDatasetRow = Record<
  string,
  string | number | boolean | Date | null | undefined
>;

export const FramerAdvantages = AdvantagesFramerComponent.Responsive as any;
export const FramerBrandingCard = BrandingCardFramerComponent.Responsive as any;
export const FramerButton = ButtonFramerComponent.Responsive as any;
export const FramerCallUsCard = CallUsCardFramerComponent.Responsive as any;
export const FramerCaptionButton = CaptionButtonFramerComponent.Responsive as any;
export const FramerCmsCard = CmsCardFramerComponent.Responsive as any;
export const FramerFaqCard = FaqCardFramerComponent.Responsive as any;
export const FramerFeaturesCard = FeaturesCardFramerComponent.Responsive as any;
export const FramerFooterAndCta = FooterAndCtaFramerComponent.Responsive as any;
export const FramerHowItWorksCard =
  HowItSWorkCardFramerComponent.Responsive as any;
export const FramerNav = NavFramerComponent.Responsive as any;
export const FramerOurMission = OurMissionFramerComponent.Responsive as any;
export const FramerPartnersLogo =
  OurPartnersLogoFramerComponent.Responsive as any;
export const FramerPricing = OurPricingFramerComponent.Responsive as any;
export const FramerPickYourPlan =
  PickYourPlanFramerComponent.Responsive as any;
export const FramerSocialMedia = SocialMediaFramerComponent.Responsive as any;
export const FramerTeamCard = TeamCardFramerComponent.Responsive as any;
export const FramerTestimonialCard =
  TestimonialCardFramerComponent.Responsive as any;

const FramerDataVisualisePro =
  DataVisualiseProFramerComponent.Responsive as any;

function csvEscape(value: FramerDatasetRow[string]) {
  if (value == null) return '';

  const text =
    value instanceof Date ? value.toISOString() : String(value).trim();

  return `"${text.replaceAll('"', '""')}"`;
}

function rowsToCsv(rows: FramerDatasetRow[]) {
  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()),
  );

  if (!headers.length) return '';

  const lines = rows.map((row) =>
    headers.map((header) => csvEscape(row[header])).join(','),
  );

  return [headers.join(','), ...lines].join('\n');
}

export function FramerButtonLink({
  href,
  label,
  variant = 'Button',
  className,
}: {
  href: string;
  label: string;
  variant?: 'Button' | 'Button 2' | 'Button 3' | 'Button 4' | 'Button 5';
  className?: string;
}) {
  return (
    <FramerButton
      buttonText={label}
      className={className}
      link={href}
      style={{ width: '100%' }}
      variant={variant}
      visible
    />
  );
}

export function FramerDataPanel({
  rows,
  datasetTitle,
  titleColumn,
  valueColumn,
  categoryColumn,
  dateColumn,
  className,
  primaryColor = '#284bff',
  accentColor = '#0f766e',
  background = '#ffffff',
  panelBase = '#eef3ff',
  text = '#140a3e',
  maxWidth = 1280,
  borderRadius = 32,
  darkMode = false,
}: {
  rows: FramerDatasetRow[];
  datasetTitle: string;
  titleColumn: string;
  valueColumn: string;
  categoryColumn: string;
  dateColumn: string;
  className?: string;
  primaryColor?: string;
  accentColor?: string;
  background?: string;
  panelBase?: string;
  text?: string;
  maxWidth?: number;
  borderRadius?: number;
  darkMode?: boolean;
}) {
  const csv = useMemo(() => rowsToCsv(rows), [rows]);
  const [dataFile, setDataFile] = useState<string>();

  useEffect(() => {
    if (!csv) {
      setDataFile(undefined);
      return;
    }

    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
    );

    setDataFile(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [csv]);

  if (!dataFile) return null;

  return (
    <FramerDataVisualisePro
      accentColor={accentColor}
      background={background}
      borderRadius={borderRadius}
      className={className}
      colCategory={categoryColumn}
      colDate={dateColumn}
      colTitle={titleColumn}
      colValue={valueColumn}
      darkMode={darkMode}
      dataSource={dataFile}
      datasetTitle={datasetTitle}
      maxWidth={maxWidth}
      panelBase={panelBase}
      primaryColor={primaryColor}
      style={{ width: '100%' }}
      text={text}
    />
  );
}
