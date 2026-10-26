'use client'

import { useEffect, useState } from 'react'

/**
 * 进站引导动画（宝库开启风，每会话一次）：
 * 转盘旋开 → 💎 升起 → 整层淡出揭示。
 * 会话标记由 layout 内联脚本在文档开头完成；prefers-reduced-motion 直接跳过。
 */
export function EntranceOverlay() {
  const [gone, setGone] = useState(false)

  useEffect(() => {
    if (document.documentElement.dataset.boot === 'done') {
      setGone(true)
      return
    }
    const onAnimEnd = (e: AnimationEvent) => {
      if (e.animationName === 'tr-exit') {
        document.documentElement.dataset.boot = 'done'
        setGone(true)
      }
    }
    document.addEventListener('animationend', onAnimEnd)
    const fallback = window.setTimeout(() => {
      document.documentElement.dataset.boot = 'done'
      setGone(true)
    }, 6000)
    return () => {
      document.removeEventListener('animationend', onAnimEnd)
      window.clearTimeout(fallback)
    }
  }, [])

  if (gone) return null

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
html[data-boot='done'] .tr-boot{display:none}
.tr-boot{position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;background:radial-gradient(ellipse 80% 55% at 50% 35%,rgba(20,184,166,.12),transparent),#061417;font-family:system-ui,sans-serif;animation:tr-exit .55s cubic-bezier(.65,0,.35,1) 2.6s forwards}
.tr-boot .tr-gem{font-size:clamp(52px,9vw,84px);filter:drop-shadow(0 0 26px rgba(45,212,191,.65));animation:tr-spin 1.1s cubic-bezier(.3,0,.4,1) both,tr-in .4s cubic-bezier(.22,1,.36,1) 1.1s both}
.tr-boot .tr-logo{font-size:clamp(26px,5vw,44px);font-weight:800;color:#5eead4;letter-spacing:.04em;opacity:0;animation:tr-in .45s ease .5s both}
.tr-boot .tr-bar{width:min(280px,62vw);height:3px;border-radius:999px;overflow:hidden;background:rgba(45,212,191,.16);opacity:0;animation:tr-in .3s ease 1.25s both}
.tr-boot .tr-bar::before{content:'';display:block;height:100%;background:linear-gradient(90deg,#14b8a6,#5eead4);transform:scaleX(0);transform-origin:left;animation:tr-fill 1.2s cubic-bezier(.3,0,.4,1) 1.35s forwards}
.tr-boot .tr-line{font-family:ui-monospace,monospace;font-size:13px;letter-spacing:.1em;color:#94a3b8;opacity:0;animation:tr-in .3s ease 1.6s both}
.tr-boot .tr-line b{color:#5eead4;font-weight:600}
@keyframes tr-spin{from{transform:rotate(-360deg) scale(.4);opacity:0}to{opacity:1}}
@keyframes tr-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes tr-fill{to{transform:scaleX(1)}}
@keyframes tr-exit{to{opacity:0;visibility:hidden;transform:scale(1.04)}}
@media (prefers-reduced-motion:reduce){.tr-boot{display:none}}
`,
        }}
      />
      <div className="tr-boot" aria-hidden="true">
        <div className="tr-gem">💎</div>
        <div className="tr-logo">TREASURY</div>
        <div className="tr-bar" />
        <div className="tr-line">
          {'> vault unlocked · '}<b>bookmarks secured</b>
        </div>
      </div>
    </>
  )
}
