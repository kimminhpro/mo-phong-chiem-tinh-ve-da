import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://kimminhpro.github.io/mo-phong-chiem-tinh-ve-da/"),
  title: "Jyotish Orbit — Bầu trời Vệ Đà",
  description:
    "Bầu trời Jyotish 3D với Swiss Ephemeris, Lagna, 12 bhāva Whole Sign, lá số D1, 27 Nakshatra và 108 pāda.",
  openGraph: {
    title: "Jyotish Orbit — Bầu trời Vệ Đà",
    description: "Lagna · Whole Sign · Swiss Ephemeris",
    images: [{ url: "/og.png", width: 1536, height: 1024 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Jyotish Orbit — Bầu trời Vệ Đà",
    description: "Lagna · Whole Sign · Swiss Ephemeris",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
