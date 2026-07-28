/**
 * 飞书记录读取 - Vercel Serverless Function
 * GET /api/records
 *
 * 环境变量:
 *   FEISHU_APP_ID         - 飞书应用 App ID
 *   FEISHU_APP_SECRET      - 飞书应用 App Secret
 *   FEISHU_APP_TOKEN       - 多维表格 App Token
 *   FEISHU_TABLE_ID        - 多维表格 Table ID
 */

const FEISHU_BASE = "https://open.feishu.cn/open-apis";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

let cachedToken = null;
let tokenExpireAt = 0;

async function getTenantAccessToken() {
  if (cachedToken && Date.now() < tokenExpireAt) return cachedToken;

  const resp = await fetch(`${FEISHU_BASE}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: process.env.FEISHU_APP_ID,
      app_secret: process.env.FEISHU_APP_SECRET,
    }),
  });

  const data = await resp.json();
  if (data.code !== 0) throw new Error("获取飞书token失败: " + (data.msg || ""));

  cachedToken = data.tenant_access_token;
  tokenExpireAt = Date.now() + (data.expire - 300) * 1000;
  return cachedToken;
}

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = await getTenantAccessToken();
    const allRecords = [];
    let pageToken = null;

    do {
      let url = `${FEISHU_BASE}/bitable/v1/apps/${process.env.FEISHU_APP_TOKEN}/tables/${process.env.FEISHU_TABLE_ID}/records?page_size=500`;
      if (pageToken) url += "&page_token=" + pageToken;

      const resp = await fetch(url, {
        headers: { Authorization: "Bearer " + token },
      });

      const data = await resp.json();
      if (data.code !== 0) throw new Error("读取记录失败: " + (data.msg || ""));

      if (data.data && data.data.items) {
        for (const item of data.data.items) {
          const f = item.fields || {};
          allRecords.push({
            student_name: f["学生姓名"] || "",
            student_id: f["学号"] || "",
            question: f["问题"] || "",
            answer: f["回答"] || "",
            type: f["类型"] || "对话",
            time: f["时间"] || item.created_time || "",
          });
        }
      }

      pageToken = data.data && data.data.has_more ? data.data.page_token : null;
    } while (pageToken);

    res.status(200).json({ records: allRecords });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
