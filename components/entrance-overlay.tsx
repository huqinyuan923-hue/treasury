'use client'

import { useEffect, useState } from 'react'

/**
 * 进站引导动画（金库开启风，每会话一次）。
 * 单时钟状态机：layout 内联脚本 playing → 双 rAF → go（CSS 起播），
 * 本组件负责水合后门控淡出——进度条 tr-fill 结束 +150ms 才加 boot-exiting，
 * 淡出动画 tr-exit 结束后切 done 卸载；水合晚于进度条结束时用 getAnimations 补收尾。
 */

const TR_BOLTS = ['第 1 道锁舌', '第 2 道锁舌', '第 3 道锁舌']

const TR_LEDGER = [
  { k: '收入', v: '+12,400', cls: 'in' },
  { k: '支出', v: '-3,180', cls: 'out' },
]

const FILL_ANIM = 'tr-fill'
const EXIT_ANIM = 'tr-exit'
const BOOT_FALLBACK_MS = 3400
const EXIT_FALLBACK_MS = 1200

type BootWindow = Window & { __bootT0?: number }

export function EntranceOverlay() {
  const [gone, setGone] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    if (root.dataset.boot === 'done') {
      setGone(true)
      return
    }

    let fillTimer = 0
    let fallbackTimer = 0
    let finishTimer = 0

    const finish = () => {
      if (root.dataset.boot === 'done') return
      root.classList.remove('boot-exiting')
      root.dataset.boot = 'done'
      setGone(true)
    }
    const startExit = () => {
      if (root.dataset.boot === 'done' || root.classList.contains('boot-exiting')) return
      root.classList.add('boot-exiting')
      finishTimer = window.setTimeout(finish, EXIT_FALLBACK_MS)
    }
    const onAnimEnd = (e: AnimationEvent) => {
      if (e.animationName === EXIT_ANIM) finish()
      else if (e.animationName === FILL_ANIM) {
        // 进度条跑满后再留一拍，保证余额计数走完才淡出
        fillTimer = window.setTimeout(startExit, 600)
      }
    }
    document.addEventListener('animationend', onAnimEnd)

    if (root.dataset.boot !== 'playing' && root.dataset.boot !== 'go') {
      finish()
      return () => document.removeEventListener('animationend', onAnimEnd)
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish()
      return () => document.removeEventListener('animationend', onAnimEnd)
    }

    // 内联脚本的起播 rAF 若被主线程卡住，这里补一个时钟锚点
    if (root.dataset.boot === 'playing') {
      root.dataset.boot = 'go'
      ;(window as BootWindow).__bootT0 = performance.now()
    }
    const t0 = (window as BootWindow).__bootT0 ?? performance.now()

    // 水合晚于进度条结束时，animationend 已经错过：直接补一个短收尾
    const overlay = document.querySelector<HTMLElement>('.tr-boot')
    const fill = overlay
      ?.getAnimations({ subtree: true })
      .find((a) => (a as CSSAnimation).animationName === FILL_ANIM)
    const fillEnd =
      fill && fill.startTime !== null
        ? Number(fill.startTime) + Number(fill.effect?.getComputedTiming().endTime ?? 0)
        : 0
    if (fillEnd > 0 && fillEnd <= performance.now()) {
      fillTimer = window.setTimeout(startExit, 600)
    }

    fallbackTimer = window.setTimeout(
      startExit,
      Math.max(0, t0 + BOOT_FALLBACK_MS - performance.now())
    )

    return () => {
      document.removeEventListener('animationend', onAnimEnd)
      window.clearTimeout(fillTimer)
      window.clearTimeout(fallbackTimer)
      window.clearTimeout(finishTimer)
    }
  }, [])

  if (gone) return null

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
html[data-boot='done'] .tr-boot{display:none}
.tr-boot{position:fixed;inset:0;z-index:9999;display:none;flex-direction:column;align-items:center;justify-content:center;gap:13px;background:radial-gradient(ellipse 80% 55% at 50% 35%,rgba(20,184,166,.12),transparent),#061417;font-family:system-ui,'PingFang SC','Microsoft YaHei',sans-serif;overflow:hidden}
html[data-boot='playing'] .tr-boot,html[data-boot='go'] .tr-boot{display:flex}
html.boot-exiting .tr-boot{animation:tr-exit .5s cubic-bezier(.65,0,.35,1) forwards}
@keyframes tr-exit{to{opacity:0;visibility:hidden;transform:scale(1.04)}}
/* 品牌（预引导即可见）+ 光标 */
.tr-boot .tr-logo{font-size:clamp(24px,4.6vw,42px);font-weight:800;letter-spacing:.06em;color:#5eead4;text-align:center}
.tr-boot .tr-caret{display:inline-block;width:.055em;height:.78em;margin-left:.12em;border-radius:1px;background:#14b8a6;vertical-align:-.02em;animation:tr-blink 1.1s steps(1,end) infinite}
@keyframes tr-blink{0%,55%{opacity:1}56%,100%{opacity:0}}
/* 💎 旋转升腾（静态辉光，不动 filter） */
.tr-boot .tr-gem{height:64px;display:flex;align-items:center;justify-content:center}
.tr-boot .tr-gem span{font-size:clamp(44px,7.6vw,68px);line-height:1;filter:drop-shadow(0 0 22px rgba(45,212,191,.55));opacity:0;transform:translateY(26px) rotate(-300deg) scale(.45)}
html[data-boot='go'] .tr-boot .tr-gem span{animation:tr-rise .62s cubic-bezier(.22,1,.36,1) .12s both}
@keyframes tr-rise{from{opacity:0;transform:translateY(26px) rotate(-300deg) scale(.45)}to{opacity:1;transform:none}}
/* 锁舌逐行咬合 */
.tr-boot .tr-bolts{display:flex;flex-direction:column;gap:5px;min-width:min(280px,68vw);font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12.5px;letter-spacing:.04em;color:#94a3b8}
.tr-boot .tr-bolts .row{display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center;opacity:0}
.tr-boot .tr-bolts .row .bg{color:#2dd4bf;letter-spacing:.14em}
.tr-boot .tr-bolts .row .ck{color:#7af0c8;font-weight:700;opacity:0}
html[data-boot='go'] .tr-boot .tr-bolts .row{animation:tr-in .3s cubic-bezier(.2,.7,.3,1) calc(.95s + var(--i)*.2s) both}
html[data-boot='go'] .tr-boot .tr-bolts .row .ck{animation:tr-pop .3s cubic-bezier(.34,1.56,.64,1) calc(1.25s + var(--i)*.2s) both}
@keyframes tr-in{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:none}}
@keyframes tr-pop{from{opacity:0;transform:scale(.4)}to{opacity:1;transform:none}}
/* VAULT UNLOCKED 闪现 */
.tr-boot .tr-unlocked{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:clamp(13px,2.2vw,18px);font-weight:700;letter-spacing:.24em;color:#5eead4;text-shadow:0 0 18px rgba(45,212,191,.6);opacity:0;transform:scale(.86)}
html[data-boot='go'] .tr-boot .tr-unlocked{animation:tr-flash .45s cubic-bezier(.34,1.56,.64,1) 1.6s both}
@keyframes tr-flash{from{opacity:0;transform:scale(.86)}45%{opacity:1;transform:scale(1.04)}to{opacity:1;transform:none}}
/* 账目三行 + 余额整数计数 */
@property --trbal{syntax:'<integer>';initial-value:0;inherits:false}
.tr-boot .tr-ledger{display:flex;flex-direction:column;gap:5px;min-width:min(280px,68vw);font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12.5px;color:#94a3b8}
.tr-boot .tr-ledger .row{display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center;opacity:0}
.tr-boot .tr-ledger .row .v{font-weight:700;font-variant-numeric:tabular-nums;text-align:right}
.tr-boot .tr-ledger .in .v{color:#7af0c8}
.tr-boot .tr-ledger .out .v{color:#ff7b8e}
.tr-boot .tr-ledger .bal .v{color:#5eead4;counter-reset:baln var(--trbal)}
.tr-boot .tr-ledger .bal .v::after{content:'¥' counter(baln)}
html[data-boot='go'] .tr-boot .tr-ledger .row{animation:tr-in .3s cubic-bezier(.2,.7,.3,1) calc(1.8s + var(--i)*.15s) both}
html[data-boot='go'] .tr-boot .tr-ledger .bal .v{animation:tr-count .55s cubic-bezier(.3,0,.4,1) 2s both}
@keyframes tr-count{from{--trbal:0}to{--trbal:9220}}
/* 进度条 + 百分比 */
.tr-boot .tr-bar{width:min(290px,62vw);height:3px;border-radius:999px;overflow:hidden;background:rgba(45,212,191,.16);opacity:0}
html[data-boot='go'] .tr-boot .tr-bar{animation:tr-in .3s ease .45s both}
.tr-boot .tr-bar::before{content:'';display:block;height:100%;background:linear-gradient(90deg,#14b8a6,#5eead4);box-shadow:0 0 12px rgba(20,184,166,.7);transform:scaleX(0);transform-origin:left}
html[data-boot='go'] .tr-boot .tr-bar::before{animation:tr-fill 1.9s cubic-bezier(.3,0,.4,1) .6s forwards}
@keyframes tr-fill{to{transform:scaleX(1)}}
@property --trn{syntax:'<integer>';initial-value:0;inherits:false}
.tr-boot .tr-pct{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12px;color:#5eead4;opacity:0;counter-reset:trn var(--trn)}
.tr-boot .tr-pct::after{content:counter(trn) '%'}
html[data-boot='go'] .tr-boot .tr-pct{animation:tr-in .3s ease .5s both,tr-count-pct 1.9s cubic-bezier(.3,0,.4,1) .6s both}
@keyframes tr-count-pct{from{--trn:0}to{--trn:100}}
.tr-boot .tr-ready{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:13px;letter-spacing:.3em;color:#7af0c8;opacity:0}
html[data-boot='go'] .tr-boot .tr-ready{animation:tr-in .3s ease 2.4s both}
@media (prefers-reduced-motion:reduce){html[data-boot='playing'] .tr-boot,html[data-boot='go'] .tr-boot{display:none}}
`,
        }}
      />
      <div className="tr-boot" aria-hidden="true">
        <div className="tr-gem">
          <span>💎</span>
        </div>
        <div className="tr-logo">
          TREASURY
          <span className="tr-caret" />
        </div>
        <div className="tr-bolts">
          {TR_BOLTS.map((b, i) => (
            <div key={b} className="row" style={{ '--i': i } as React.CSSProperties}>
              <span className="bg">▮▮</span>
              <span>{b} · 咬合</span>
              <span className="ck">✓</span>
            </div>
          ))}
        </div>
        <div className="tr-unlocked">VAULT UNLOCKED</div>
        <div className="tr-ledger">
          {TR_LEDGER.map((l, i) => (
            <div
              key={l.k}
              className={'row ' + l.cls}
              style={{ '--i': i } as React.CSSProperties}
            >
              <span>{l.k}</span>
              <span />
              <span className="v">{l.v}</span>
            </div>
          ))}
          <div className="row bal" style={{ '--i': 2 } as React.CSSProperties}>
            <span>结余</span>
            <span />
            <span className="v" />
          </div>
        </div>
        <div className="tr-bar" />
        <div className="tr-pct" />
        <div className="tr-ready">READY</div>
      </div>
    </>
  )
}
