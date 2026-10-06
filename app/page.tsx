"use client";

import Link from "next/link";
import type { Link as LinkRow } from "@/db/schema";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function Dashboard() {
  const [links, setLinks] = useState<LinkRow[] | null>(null);
  const [url, setUrl] = useState("");
  const [tags, setTags] = useState("");
  const [q, setQ] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/links");
    if (res.status === 401) {
      location.href = "/login";
      return;
    }
    const data = await res.json();
    setLinks(data.links);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setAdding(true);
    setMsg(null);
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), tags: tags.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ text: "✗ " + (data.error || "添加失败"), ok: false });
      } else if (data.duplicate) {
        setMsg({ text: "⚠ 这个链接已经收藏过了", ok: false });
      } else {
        setMsg({
          text: (data.fetched ? "✓ 已收藏：" : "✓ 已收藏（标题抓取失败，用了域名）：") + data.link.title,
          ok: true,
        });
        setUrl("");
        setTags("");
        await load();
      }
    } catch {
      setMsg({ text: "✗ 网络异常", ok: false });
    } finally {
      setAdding(false);
    }
  }

  async function del(id: number) {
    if (!confirm("确定删除这条收藏吗？")) return;
    setDeletingId(id);
    try {
      await fetch("/api/links?id=" + id, { method: "DELETE" });
      setLinks((ls) => (ls ? ls.filter((l) => l.id !== id) : ls));
    } finally {
      setDeletingId(null);
    }
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    location.href = "/login";
  }

  // 全部标签
  const allTags = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of links || []) for (const t of l.tags) m.set(t, (m.get(t) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [links]);

  // 搜索 + 标签过滤
  const filtered = useMemo(() => {
    let list = links || [];
    if (activeTag) list = list.filter((l) => l.tags.includes(activeTag));
    const kw = q.trim().toLowerCase();
    if (kw) {
      list = list.filter(
        (l) =>
          l.title.toLowerCase().includes(kw) ||
          l.description.toLowerCase().includes(kw) ||
          l.url.toLowerCase().includes(kw) ||
          l.tags.some((t) => t.toLowerCase().includes(kw))
      );
    }
    return list;
  }, [links, q, activeTag]);

  return (
    <>
      <header className="site-header">
        <div className="wrap header-inner">
          <Link className="brand" href="/">💎 Treasury <span className="gem">书签云收藏</span></Link>
          <div className="header-actions">
            <button className="btn" onClick={logout}>退出登录</button>
          </div>
        </div>
      </header>

      <main className="wrap">
        <form className="add-panel" onSubmit={addLink}>
          <div className="add-row">
            <input
              type="url"
              placeholder="粘贴链接，例如 https://github.com/…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              aria-label="书签网址"
            />
            <button className="btn primary" disabled={adding}>
              {adding ? "抓取中…" : "收藏"}
            </button>
          </div>
          <div className="add-sub">
            <input
              type="text"
              placeholder="标签（可选，空格或逗号分隔，如：前端 工具）"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              aria-label="标签"
            />
          </div>
          <p className={"msg" + (msg ? (msg.ok ? " ok" : " err") : "")} role="status" aria-live="polite">
            {msg?.text || ""}
          </p>
        </form>

        <div className="filter-row">
          <input
            type="search"
            placeholder="搜索标题、描述、网址、标签…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="搜索书签"
          />
          {activeTag && (
            <button className="tag-chip on" onClick={() => setActiveTag("")}>
              ✕ {activeTag}
            </button>
          )}
          <span className="count-note">
            {links === null ? "加载中…" : `${filtered.length} / ${links.length} 条`}
          </span>
        </div>

        {allTags.length > 0 && !activeTag && (
          <div className="filter-row">
            {allTags.map(([t, n]) => (
              <button key={t} className="tag-chip" onClick={() => setActiveTag(t)}>
                {t} · {n}
              </button>
            ))}
          </div>
        )}

        <section className="link-list" aria-live="polite">
          {links === null && <p className="empty">正在加载书签…</p>}
          {links !== null && filtered.length === 0 && (
            <p className="empty">
              {links.length === 0 ? "还没有收藏，粘贴上面第一个链接开始吧 👆" : "没有匹配的收藏"}
            </p>
          )}
          {filtered.map((l) => (
            <div key={l.id} className="link-card">
              <a className="lc-title" href={l.url} target="_blank" rel="noopener noreferrer">
                {l.title}
              </a>
              <span className="lc-host">{hostOf(l.url)}</span>
              {l.description && <p className="lc-desc">{l.description}</p>}
              {l.tags.length > 0 && (
                <div className="lc-tags">
                  {l.tags.map((t) => (
                    <span key={t} role="button" onClick={() => setActiveTag(t)}>{t}</span>
                  ))}
                </div>
              )}
              <button
                className="lc-del"
                onClick={() => del(l.id)}
                disabled={deletingId === l.id}
                aria-label={`删除 ${l.title}`}
              >
                {deletingId === l.id ? "删除中…" : "删除"}
              </button>
            </div>
          ))}
        </section>
      </main>
    </>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
