import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/ui/BottomNav";

export const metadata: Metadata = {
  title: {
    default: "PRO-MANAGEMENT",
    template: "%s | PRO-MANAGEMENT",
  },
  description: "リフォーム・工事会社向け案件・利益管理アプリ",
  applicationName: "PRO-MANAGEMENT",
  manifest: "/manifest.json",
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
