/**
 * 飞书记录写入 - Netlify Function
 * POST /api/record
 *
 * 环境变量:
 *   FEISHU_APP_ID         - 飞书应用 App ID
 *   FEISHU_APP_SECRET      - 飞书应用 App Secret
 *   FEISHU_APP_TOKEN       - 多维表格 App Token
 *   FEISHU_TABLE_ID        - 多维表格 Table ID
 */

const FEISHU_BASE = "https://open.feishu.cn/open-apis";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function response(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: { ...CORS_HEADERS, ...extraHeaders },
    body: typeof body === "string" ? body : JSON.stringify(body),
  };
}

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

exports.handler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") {
    return response(200, "");
  }

  if (event.httpMethod !== "POST") {
    return response(405, { error: "Method not allowed" });
  }

  try {
    const body = JSON.parse(event.body || "{}");

    const token = await getTenantAccessToken();
    const url = `${FEISHU_BASE}/bitable/v1/apps/${process.env.FEISHU_APP_TOKEN}/tables/${process.env.FEISHU_TABLE_ID}/records`;

    const fields = {
      "学生姓名": body.student_name || "",
      "学号": body.student_id || "",
      "问题": body.question || "",
      "回答": (body.answer || "").substring(0, 1000),
      "类型": body.type || "对话",
      "时间": Date.now(),
    };

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

    return response(200, { success: true });
  } catch (err) {
    return response(500, { error: err.message });
  }
};
