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
      {/* 进站动画会话标记：水合前执行（每会话一次）。
          看过 → done；首访 → playing（遮罩立即上屏），等首帧真正可见再切 go 起播，
          慢网络下动画不会被截断；水合迟迟不来时 go 后 6s（未起播 10s）淡出兜底。 */}
      <script
        dangerouslySetInnerHTML={{
          __html: `try{var d=document.documentElement,s=sessionStorage;if(s.getItem('boot-seen')){d.dataset.boot='done'}else if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches){d.dataset.boot='done';s.setItem('boot-seen','1')}else{s.setItem('boot-seen','1');d.dataset.boot='playing';var cap=function(){if(d.dataset.boot==='playing'||d.dataset.boot==='go'){d.classList.add('boot-exiting');setTimeout(function(){if(d.dataset.boot!=='done')d.dataset.boot='done'},800)}};var capTimer=setTimeout(cap,10000);var start=function(){if(d.dataset.boot!=='playing')return;d.dataset.boot='go';window.__bootT0=performance.now();clearTimeout(capTimer);capTimer=setTimeout(cap,6000)};var go=function(){if(d.dataset.boot!=='playing')return;if(!document.querySelector('.tr-boot')){if(go.n++!==100){setTimeout(go,30);return}}var r=window.requestAnimationFrame;if(r){r(function(){r(start)})}else{setTimeout(start,32)}};go.n=0;go()}}catch(e){}`,
        }}
      />
      <body>
        <EntranceOverlay />
        {children}
      </body>
    </html>
  );
}
