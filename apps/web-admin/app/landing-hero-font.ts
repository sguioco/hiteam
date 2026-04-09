import localFont from "next/font/local";

/** Hero-only display face. Keep it non-blocking to avoid first-paint font swaps. */
export const petersburgHero = localFont({
  src: "../public/fonts/Petersburg.ttf",
  display: "optional",
  weight: "400",
  style: "normal",
  variable: "--font-petersburg-hero",
});
