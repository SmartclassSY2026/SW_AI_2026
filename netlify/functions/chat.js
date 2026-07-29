/**
 * 腾讯元器 API 代理 - Netlify Function
 * POST /api/chat
 *
 * 环境变量:
 *   YUANQI_ASSISTANT_ID  - 腾讯元器智能体 appid
 *   YUANQI_TOKEN          - 腾讯元器 API Token (appkey)
 */

const YUANQI_API = "https://yuanqi.tencent.com/openapi/v1/agent/chat/completions";

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

exports.handler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") {
    return response(200, "");
  }

  if (event.httpMethod !== "POST") {
    return response(405, { error: "Method not allowed" });
  }

  try {
    const body = JSON.parse(event.body || "{}");

    const apiBody = {
      assistant_id: process.env.YUANQI_ASSISTANT_ID,
      user_id: body.user_id || "anonymous",
      stream: false,
      messages: body.messages || [],
    };

    const resp = await fetch(YUANQI_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.YUANQI_TOKEN,
        "X-Source": "openapi",
      },
      body: JSON.stringify(apiBody),
    });

    const data = await resp.json();

    if (data.error) {
      return response(resp.status, { error: data.error.message || data.error });
    }

    return response(200, data, { "Content-Type": "application/json" });
  } catch (err) {
    return response(500, { error: err.message });
  }
};
