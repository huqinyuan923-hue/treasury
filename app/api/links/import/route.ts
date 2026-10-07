import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { links } from "@/db/schema";
import { normalizeUrl } from "@/lib/fetch-meta";

const MAX_IMPORT = 500;

/** 规范化标签（与 /api/links POST 一致） */
function normalizeTags(input: string[] | undefined): string[] {
  const list = Array.isArray(input) ? input : [];
  return [
    ...new Set(
      list
        .map((t) => String(t).trim().slice(0, 30))
        .filter(Boolean),
    ),
  ].slice(0, 8);
}

/** POST /api/links/import { items: [{ url, title?, description?, tags? }] }
 * 浏览器书签批量导入：全部参数绑定，重复 URL 自动跳过，单次上限 500 条。 */
export async function POST(req: Request) {
  let body: {
    items?: { url?: string; title?: string; description?: string; tags?: string[] }[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const items = body.items;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "没有可导入的条目" }, { status: 400 });
  }
  if (items.length > MAX_IMPORT) {
    return NextResponse.json(
      { error: `单次最多导入 ${MAX_IMPORT} 条，请分批操作` },
      { status: 413 },
    );
  }

  // 整理 + 批内去重
  const seen = new Set<string>();
  const rows: {
    url: string;
    title: string;
    description: string;
    tags: string[];
  }[] = [];
  let invalid = 0;

  for (const item of items.slice(0, MAX_IMPORT)) {
    const parsed = normalizeUrl(item.url || "");
    if (!parsed) { invalid++; continue; }
    const url = parsed.toString();
    if (seen.has(url)) continue;
    seen.add(url);
    rows.push({
      url,
      title: (item.title || "").trim().slice(0, 300) || parsed.hostname,
      description: (item.description || "").trim().slice(0, 500),
      tags: normalizeTags(item.tags),
    });
  }

  if (!rows.length) {
    return NextResponse.json(
      { inserted: 0, duplicates: 0, invalid, error: "没有有效的 URL" },
      { status: 400 },
    );
  }

  const insertedRows = await db
    .insert(links)
    .values(rows)
    .onConflictDoNothing({ target: links.url })
    .returning({ id: links.id });

  return NextResponse.json({
    inserted: insertedRows.length,
    duplicates: rows.length - insertedRows.length,
    invalid,
  });
}
