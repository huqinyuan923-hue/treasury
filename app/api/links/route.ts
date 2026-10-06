import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { links } from "@/db/schema";
import { isAuthenticated } from "@/lib/auth";
import { fetchPageMeta, normalizeUrl } from "@/lib/fetch-meta";

/** GET /api/links?q=关键词&tag=标签 — 列表 + 搜索 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().slice(0, 100);
  const tag = (searchParams.get("tag") || "").trim().slice(0, 50);

  const rows = await db.select().from(links).orderBy(desc(links.createdAt));

  // 内存过滤：个人书签量级（数千条）下足够快，且支持任意字段模糊匹配
  let result = rows;
  if (tag) result = result.filter((r) => r.tags.includes(tag));
  if (q) {
    const kw = q.toLowerCase();
    result = result.filter(
      (r) =>
        r.title.toLowerCase().includes(kw) ||
        r.description.toLowerCase().includes(kw) ||
        r.url.toLowerCase().includes(kw) ||
        r.tags.some((t) => t.toLowerCase().includes(kw))
    );
  }
  return NextResponse.json({ links: result });
}

/** POST /api/links { url, title?, description?, tags? } */
export async function POST(req: Request) {
  let body: {
    url?: string;
    title?: string;
    description?: string;
    tags?: string[] | string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const parsed = normalizeUrl(body.url || "");
  if (!parsed) {
    return NextResponse.json(
      { error: "URL 无效（仅支持 http/https，且不能是内网地址）" },
      { status: 400 }
    );
  }

  // 去重：同一 URL 只存一次
  const existing = await db
    .select()
    .from(links)
    .where(eq(links.url, parsed.toString()))
    .limit(1);
  if (existing.length) {
    return NextResponse.json({ link: existing[0], duplicate: true });
  }

  // 未提供标题时服务端抓取页面 meta
  let title = "", description = "", fetched = false;
  if (body.title && body.title.trim()) {
    title = body.title.trim().slice(0, 300);
    description = (body.description || "").trim().slice(0, 500);
  } else {
    const meta = await fetchPageMeta(parsed);
    title = meta.title.slice(0, 300);
    description = (body.description || meta.description || "").trim().slice(0, 500);
    fetched = meta.ok;
  }

  const tags = normalizeTags(body.tags);

  const inserted = await db
    .insert(links)
    .values({ url: parsed.toString(), title: title || parsed.hostname, description, tags })
    .returning();
  return NextResponse.json({ link: inserted[0], fetched, duplicate: false });
}

/** DELETE /api/links?id=123 */
export async function DELETE(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "无效的 id" }, { status: 400 });
  }
  const deleted = await db.delete(links).where(eq(links.id, id)).returning();
  if (!deleted.length) return NextResponse.json({ error: "条目不存在" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

/** PATCH /api/links?id=123 { tags?, title?, description? } */
export async function PATCH(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "无效的 id" }, { status: 400 });
  }
  let body: { title?: string; description?: string; tags?: string[] | string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const patch: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim())
    patch.title = body.title.trim().slice(0, 300);
  if (typeof body.description === "string")
    patch.description = body.description.trim().slice(0, 500);
  if (body.tags !== undefined) patch.tags = normalizeTags(body.tags);
  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "没有要更新的字段" }, { status: 400 });
  }
  const updated = await db.update(links).set(patch).where(eq(links.id, id)).returning();
  if (!updated.length) return NextResponse.json({ error: "条目不存在" }, { status: 404 });
  return NextResponse.json({ link: updated[0] });
}

function normalizeTags(input: string[] | string | undefined): string[] {
  const list = Array.isArray(input) ? input : (input || "").split(/[,，\s]+/);
  return [...new Set(
    list.map((t) => String(t).trim().slice(0, 30)).filter(Boolean).slice(0, 8)
  )];
}
