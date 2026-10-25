import type { Metadata, Viewport } from "next";
import { EntranceOverlay } from "@/components/entrance-overlay";
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
      {/* 进站动画会话标记：水合前执行（每会话一次） */}
      <script
        dangerouslySetInnerHTML={{
          __html: `try{if(sessionStorage.getItem('boot-seen')){document.documentElement.dataset.boot='done'}else{sessionStorage.setItem('boot-seen','1')}}catch(e){}`,
        }}
      />
      <body>
        <EntranceOverlay />
        {children}
      </body>
    </html>
  );
}
