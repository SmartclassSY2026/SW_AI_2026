/**
 * 飞书记录读取 - Netlify Function
 * GET /api/records              → 无参数，返回空（不提供记录）
 * GET /api/records?student_id=xxx → 返回该学生最近 5 条记录
 * GET /api/records （带 X-Teacher-Auth: teacher123 头）→ 返回全部记录
 *
 * 环境变量:
 *   FEISHU_APP_ID         - 飞书应用 App ID
 *   FEISHU_APP_SECRET      - 飞书应用 App Secret
 *   FEISHU_APP_TOKEN       - 多维表格 App Token
 *   FEISHU_TABLE_ID        - 多维表格 Table ID
 *   TEACHER_AUTH_KEY       - 教师认证密钥（默认 teacher123）
 */

const FEISHU_BASE = "https://open.feishu.cn/open-apis";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Teacher-Auth",
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

function parseFeishuRecord(item) {
  const f = item.fields || {};
  let time = f["时间"];
  // 飞书日期字段返回毫秒时间戳，转为 ISO 字符串
  if (typeof time === "number") {
    time = new Date(time).toISOString();
  }
  return {
    student_name: f["学生姓名"] || "",
    student_id: f["学号"] || "",
    question: f["问题"] || "",
    answer: f["回答"] || "",
    type: f["类型"] || "对话",
    time: time || item.created_time || "",
  };
}

exports.handler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") {
    return response(200, "");
  }

  if (event.httpMethod !== "GET") {
    return response(405, { error: "Method not allowed" });
  }

  try {
    const params = event.queryStringParameters || {};
    const studentId = params.student_id || "";
    const teacherAuth = event.headers["x-teacher-auth"] || event.headers["X-Teacher-Auth"] || "";

    // 无 student_id 且非教师请求 → 返回空
    if (!studentId && !teacherAuth) {
      return response(200, { records: [] });
    }

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
          allRecords.push(parseFeishuRecord(item));
        }
      }

      pageToken = data.data && data.data.has_more ? data.data.page_token : null;
    } while (pageToken);

    // 学生请求：按学号过滤 + 倒序 + 最近 5 条
    if (studentId) {
      const studentRecords = allRecords
        .filter((r) => r.student_id === studentId)
        .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))
        .slice(0, 5)
        .reverse(); // 正序显示（旧→新）
      return response(200, { records: studentRecords });
    }

    // 教师请求：返回全部
    return response(200, { records: allRecords });
  } catch (err) {
    return response(500, { error: err.message });
  }
};
