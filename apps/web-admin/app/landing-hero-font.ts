import localFont from "next/font/local";

/** Hero-only display face; file: public/fonts/Petersburg_Italic.ttf */
export const petersburgHero = localFont({
  src: "../public/fonts/Petersburg_Italic.ttf",
  display: "swap",
  weight: "400",
  style: "normal",
  variable: "--font-petersburg-hero",
});
