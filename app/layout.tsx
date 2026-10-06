import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Treasury · 书签云收藏",
  description: "个人书签云收藏：自动抓取标题、标签整理、全文搜索，随处访问。",
};

export const viewport: Viewport = {
  themeColor: "#0d1024",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
