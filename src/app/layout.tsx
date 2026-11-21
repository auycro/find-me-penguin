import type { Metadata, Viewport } from "next";
import { Archivo_Black, DM_Sans, Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const display = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display-latin",
  display: "swap",
});

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body-latin",
  display: "swap",
});

// Japanese glyphs load on demand; only the Latin subset is preloaded.
const jp = Noto_Sans_JP({
  weight: ["500", "700", "900"],
  subsets: ["latin"],
  variable: "--font-jp",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Find Me Penguin · ペンギン探そう",
  description: "Upload a photo and count the penguins. 写真のペンギンを数えます。",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${jp.variable}`}>
      <body>{children}</body>
    </html>
  );
}
