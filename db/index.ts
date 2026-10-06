import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { links } from "./schema";

// 在 Serverless 环境下走 Neon HTTP 驱动；所有查询经 Drizzle 参数绑定
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema: { links } });
