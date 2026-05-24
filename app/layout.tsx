import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/ui/BottomNav";
import FaviconPersistence from "@/components/ui/FaviconPersistence";

export const metadata: Metadata = {
  title: {
    default: "こばかいアプリ",
    template: "%s | こばかいアプリ",
  },
  description: "リフォーム・工事会社向け案件・利益管理アプリ",
  applicationName: "こばかいアプリ",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "こばかいアプリ",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <FaviconPersistence />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
