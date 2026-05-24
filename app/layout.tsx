import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/ui/BottomNav";

export const metadata: Metadata = {
  title: {
    default: "案件管理",
    template: "%s | 案件管理",
  },
  description: "リフォーム・工事会社向け案件・利益管理アプリ",
  applicationName: "案件管理",
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
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
