# 💎 Treasury · 书签云收藏

[![Deployed on Vercel](https://img.shields.io/badge/部署-Vercel-black?logo=vercel)](#-部署)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Stack](https://img.shields.io/badge/Next.js%20·%20Drizzle%20·%20Neon-8b7bff?logo=postgresql)](#-技术栈)

一个**私有部署的个人书签云收藏**：粘贴链接自动抓取标题和描述，标签整理，全文搜索，随处访问。单密码登录，数据存在自己的 Neon Postgres 里。

## ✨ 功能

- **粘贴即收藏**：服务端自动抓取目标页 `<title>` 与 meta description（限 200KB、8 秒超时、失败降级为域名）
- **标签体系**：添加时打标签，标签云按数量排序，点击即筛选
- **全文搜索**：标题 / 描述 / 网址 / 标签，客户端即时过滤
- **单密码登录**：`ADMIN_PASSWORD` + JWT（jose 签名）+ HttpOnly Cookie，30 天免登录
- **去重**：同一 URL 只存一条，重复添加友好提示
- **编辑书签**：卡片内直接改标题 / 描述 / 标签（PATCH 接口 + 内联编辑表单）
- **批量导入**：上传浏览器导出的书签 HTML，文件夹层级自动转标签，批内去重，单次上限 500 条
- **favicon 显示**：每条书签展示站点图标（直连站点 /favicon.ico，加载失败自动隐藏，不依赖第三方服务）

## 🔒 安全设计

- 所有 SQL 经 **Drizzle 参数绑定**，无拼接
- 抓取目标页前做 **SSRF 防护**：仅允许 http/https，拒绝 localhost / 内网段 / 链路本地地址
- 密码校验使用 **恒定时间比较**（`timingSafeEqual`），登录失败固定延迟
- 会话为 **HS256 JWT**，Cookie `HttpOnly + Secure + SameSite=Lax`
- 页面抓取限 200KB，防大文件拖垮 serverless

## 🛠 技术栈

Next.js 15 (App Router) · Drizzle ORM · Neon Postgres (`@neondatabase/serverless` HTTP 驱动) · jose · 原生 CSS（无 UI 库）

```
db/schema.ts        links 表（url 唯一、tags text[]、时间索引）
middleware.ts       边缘鉴权：JWT 校验，API 401 / 页面重定向
app/api/links       GET 列表搜索 · POST 收藏 · PATCH 编辑 · DELETE 删除
lib/fetch-meta.ts   标题抓取 + SSRF 防护
lib/auth.ts         密码比较 / 会话签发与校验
```

## 🚀 部署

1. 创建 Neon 项目与 `treasury` 数据库，`npx drizzle-kit push` 建表
2. Vercel 导入仓库，设置环境变量：
   - `DATABASE_URL` — Neon 连接串（池化端点）
   - `ADMIN_PASSWORD` — 登录密码
   - `SESSION_SECRET` — `openssl rand -hex 32`
3. 本地开发：复制 `.env.example` 为 `.env.local` 后 `npm run dev`

## 📄 License

[MIT](LICENSE)
