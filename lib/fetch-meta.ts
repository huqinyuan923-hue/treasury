/** 服务端抓取目标页的 <title> / meta description，带 SSRF 防护与超时 */

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\./,
  /^\[?::1\]?$/,
  /^\[?fc00:/i,
  /^\[?fe80:/i,
  /\.local$/i,
  /\.internal$/i,
];

export function normalizeUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (BLOCKED_HOST_PATTERNS.some((re) => re.test(u.hostname))) return null;
    return u;
  } catch {
    return null;
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#x?([0-9a-f]+);/gi, (_, n) =>
      String.fromCodePoint(parseInt(n, n.toLowerCase().startsWith("x") ? 16 : 10))
    )
    .trim()
    .slice(0, 300);
}

export interface PageMeta {
  title: string;
  description: string;
  ok: boolean;
}

export async function fetchPageMeta(url: URL): Promise<PageMeta> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; TreasuryBookmarkBot/1.0; +https://github.com/huqinyuan923-hue)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return { title: url.hostname, description: "", ok: false };
    const type = res.headers.get("content-type") || "";
    if (!type.includes("html")) {
      return { title: url.pathname.split("/").pop() || url.hostname, description: "", ok: false };
    }
    // 只读前 200KB，避免大文件拖垮 serverless
    const reader = res.body!.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < 200 * 1024) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.length;
    }
    await reader.cancel().catch(() => {});
    const html = new TextDecoder("utf-8", { fatal: false })
      .decode(concat(chunks))
      .slice(0, 220 * 1024);

    const titleMatch = html.match(/<title[^>]*>([^<]{1,300})<\/title>/i);
    const descMatch = html.match(
      /<meta[^>]+name=["']description["'][^>]*content=["']([^"']{0,300})["']/i
    ) || html.match(/<meta[^>]+content=["']([^"']{0,300})["'][^>]*name=["']description["']/i);

    const title = titleMatch ? decodeEntities(titleMatch[1]) : "";
    const description = descMatch ? decodeEntities(descMatch[1]) : "";
    return {
      title: title || url.hostname,
      description,
      ok: Boolean(titleMatch),
    };
  } catch {
    return { title: url.hostname, description: "", ok: false };
  } finally {
    clearTimeout(timer);
  }
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}
