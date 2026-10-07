"use client";

import Link from "next/link";
import type { Link as LinkRow } from "@/db/schema";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export default function Dashboard() {
  const [links, setLinks] = useState<LinkRow[] | null>(null);
  const [url, setUrl] = useState("");
  const [tags, setTags] = useState("");
  const [q, setQ] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", tags: "" });
  const [favBroken, setFavBroken] = useState<Set<number>>(new Set());
  const importPickRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

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

  function startEdit(l: LinkRow) {
    setEditingId(l.id);
    setEditForm({ title: l.title, description: l.description, tags: l.tags.join(" ") });
  }

  async function saveEdit(id: number) {
    try {
      const res = await fetch("/api/links?id=" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description,
          tags: editForm.tags.trim() ? editForm.tags.trim().split(/[\s,，]+/) : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ text: "✗ " + (data.error || "保存失败"), ok: false });
        return;
      }
      setLinks((ls) => (ls ? ls.map((l) => (l.id === id ? data.link : l)) : ls));
      setEditingId(null);
      setMsg({ text: "✓ 已保存修改", ok: true });
    } catch {
      setMsg({ text: "✗ 网络异常", ok: false });
    }
  }

  /** 解析浏览器导出的 Netscape 书签 HTML → 条目列表（文件夹层级转为标签） */
  async function handleImport(file: File) {
    if (!file) return;
    setImporting(true);
    setMsg(null);
    try {
      const doc = new DOMParser().parseFromString(await file.text(), "text/html");
      const items: { url: string; title: string; tags: string[] }[] = [];
      outer: for (const a of doc.querySelectorAll("a")) {
        const url = a.getAttribute("href") || "";
        if (!/^https?:/i.test(url)) continue;
        const folderTags: string[] = [];
        let p: HTMLElement | null = a.parentElement;
        while (p && p.tagName !== "BODY") {
          if (p.tagName === "DL" && p.previousElementSibling?.tagName === "H3") {
            const t = p.previousElementSibling.textContent?.trim();
            if (t) folderTags.unshift(t.slice(0, 30));
          }
          p = p.parentElement;
        }
        const attrTags = (a.getAttribute("tags") || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        items.push({
          url,
          title: (a.textContent || "").trim().slice(0, 300),
          tags: [...folderTags, ...attrTags].slice(0, 8),
        });
        if (items.length >= 500) break outer;
      }
      if (!items.length) {
        setMsg({ text: "✗ 文件里没有找到书签链接", ok: false });
        return;
      }
      const res = await fetch("/api/links/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ text: "✗ " + (data.error || "导入失败"), ok: false });
        return;
      }
      setMsg({
        text: `✓ 导入完成：新增 ${data.inserted} 条${data.duplicates ? `，跳过重复 ${data.duplicates} 条` : ""}${data.invalid ? `，无效链接 ${data.invalid} 条` : ""}`,
        ok: true,
      });
      await load();
    } catch {
      setMsg({ text: "✗ 导入失败，请确认是浏览器导出的书签 HTML 文件", ok: false });
    } finally {
      setImporting(false);
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
          <div className="btn-row">
            <button type="button" className="btn mini" onClick={() => importPickRef.current?.click()} disabled={importing}>
              📥 导入浏览器书签
            </button>
            <input
              ref={importPickRef}
              type="file"
              accept=".html,.htm"
              hidden
              onChange={(e) => {
                handleImport(e.target.files?.[0] as File);
                e.target.value = "";
              }}
            />
            {importing && <span className="muted small">解析并导入中…（500 条以内，稍等）</span>}
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
              {editingId === l.id ? (
                <div className="edit-form">
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                    aria-label="标题"
                  />
                  <input
                    type="text"
                    value={editForm.description}
                    placeholder="描述（可选）"
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    aria-label="描述"
                  />
                  <input
                    type="text"
                    value={editForm.tags}
                    placeholder="标签（空格分隔）"
                    onChange={(e) => setEditForm((f) => ({ ...f, tags: e.target.value }))}
                    aria-label="标签"
                  />
                  <div className="btn-row">
                    <button className="btn primary mini" onClick={() => saveEdit(l.id)}>保存</button>
                    <button className="btn mini" onClick={() => setEditingId(null)}>取消</button>
                  </div>
                </div>
              ) : (
                <>
                  <a className="lc-title" href={l.url} target="_blank" rel="noopener noreferrer">
                    {!favBroken.has(l.id) && (
                      <img
                        className="lc-fav"
                        src={"https://" + hostOf(l.url) + "/favicon.ico"}
                        alt=""
                        width={16}
                        height={16}
                        referrerPolicy="no-referrer"
                        onError={() => setFavBroken((prev) => new Set(prev).add(l.id))}
                      />
                    )}
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
                  <div className="lc-actions">
                    <button
                      className="lc-edit"
                      onClick={() => startEdit(l)}
                      aria-label={`编辑 ${l.title}`}
                    >
                      编辑
                    </button>
                    <button
                      className="lc-del"
                      onClick={() => del(l.id)}
                      disabled={deletingId === l.id}
                      aria-label={`删除 ${l.title}`}
                    >
                      {deletingId === l.id ? "删除中…" : "删除"}
                    </button>
                  </div>
                </>
              )}
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
