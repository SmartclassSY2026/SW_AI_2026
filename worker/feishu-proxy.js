/**
 * 计算机辅助设计AI教学助手 - 一体化代理 (Cloudflare Worker)
 *
 * 功能路由：
 *   POST /chat    → 代理腾讯元器 API（SSE 流式转发），Token 存在 Worker 环境变量中
 *   POST /record  → 写入飞书多维表格记录
 *   GET  /records → 读取飞书多维表格记录列表
 *
 * 环境变量（在 Cloudflare Worker Settings → Variables 中配置）:
 *   YUANQI_ASSISTANT_ID  - 腾讯元器智能体 appid
 *   YUANQI_TOKEN          - 腾讯元器 API Token (appkey)
 *   FEISHU_APP_ID         - 飞书应用 App ID
 *   FEISHU_APP_SECRET      - 飞书应用 App Secret
 *   FEISHU_APP_TOKEN       - 多维表格 App Token (URL 中获取)
 *   FEISHU_TABLE_ID        - 多维表格 Table ID (URL 中获取)
 *
 * 安全说明：
 *   - 元器 Token 和飞书 Secret 全部存储在 Worker 环境变量中
 *   - 前端网页不接触任何密钥，学生无法通过浏览器查看
 */

const YUANQI_API = "https://yuanqi.tencent.com/openapi/v1/agent/chat/completions";
const FEISHU_BASE = "https://open.feishu.cn/open-apis";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// ==================== 元器 API 代理 ====================
async function proxyChat(request, env) {
  const body = await request.json();

  const apiBody = {
    assistant_id: env.YUANQI_ASSISTANT_ID,
    user_id: body.user_id || "anonymous",
    stream: true,
    messages: body.messages || [],
  };

  const resp = await fetch(YUANQI_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + env.YUANQI_TOKEN,
      "X-Source": "openapi",
    },
    body: JSON.stringify(apiBody),
  });

  // 直接透传 SSE 流式响应
  return new Response(resp.body, {
    status: resp.status,
    headers: {
      ...CORS,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

// ==================== 飞书 API ====================
let cachedToken = null;
let tokenExpireAt = 0;

async function getTenantAccessToken(env) {
  if (cachedToken && Date.now() < tokenExpireAt) return cachedToken;

  const resp = await fetch(`${FEISHU_BASE}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: env.FEISHU_APP_ID,
      app_secret: env.FEISHU_APP_SECRET,
    }),
  });

  const data = await resp.json();
  if (data.code !== 0) throw new Error("获取飞书token失败: " + (data.msg || ""));

  cachedToken = data.tenant_access_token;
  tokenExpireAt = Date.now() + (data.expire - 300) * 1000;
  return cachedToken;
}

async function createRecord(env, fields) {
  const token = await getTenantAccessToken(env);
  const url = `${FEISHU_BASE}/bitable/v1/apps/${env.FEISHU_APP_TOKEN}/tables/${env.FEISHU_TABLE_ID}/records`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({ fields: fields }),
  });

  const data = await resp.json();
  if (data.code !== 0) throw new Error("写入记录失败: " + (data.msg || ""));
  return data.data;
}

async function listRecords(env) {
  const token = await getTenantAccessToken(env);
  const allRecords = [];
  let pageToken = null;

  do {
    let url = `${FEISHU_BASE}/bitable/v1/apps/${env.FEISHU_APP_TOKEN}/tables/${env.FEISHU_TABLE_ID}/records?page_size=500`;
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
          type: f["类型"] || "operation",
          time: f["时间"] || item.created_time || "",
        });
      }
    }

    pageToken = data.data && data.data.has_more ? data.data.page_token : null;
  } while (pageToken);

  return allRecords;
}

// ==================== 主路由 ====================
export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "");

    try {
      // 元器 API 代理
      if (path === "/chat" && request.method === "POST") {
        return await proxyChat(request, env);
      }

      // 飞书记录写入
      if (path === "/record" && request.method === "POST") {
        const body = await request.json();
        const fields = {
          "学生姓名": body.student_name || "",
          "学号": body.student_id || "",
          "问题": body.question || "",
          "回答": (body.answer || "").substring(0, 1000),
          "类型": body.type || "operation",
          "时间": Date.now(),
        };
        await createRecord(env, fields);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...CORS, "Content-Type": "application/json" },
        });
      }

      // 飞书记录读取
      if (path === "/records" && request.method === "GET") {
        const records = await listRecords(env);
        return new Response(JSON.stringify({ records: records }), {
          headers: { ...CORS, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Not found", hint: "可用路由: POST /chat, POST /record, GET /records" }), {
        status: 404,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
  },
};
