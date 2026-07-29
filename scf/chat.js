/**
 * 腾讯元器 API 代理 - 腾讯云函数 SCF 版
 * 非流式模式（SCF 不支持 SSE 流式响应）
 *
 * 环境变量（在 SCF 函数配置 → 环境变量 中配置）:
 *   YUANQI_ASSISTANT_ID  - 腾讯元器智能体 appid
 *   YUANQI_TOKEN          - 腾讯元器 API Token (appkey)
 */

const YUANQI_API = "https://yuanqi.tencent.com/openapi/v1/agent/chat/completions";

exports.main_handler = async (event, context) => {
  var corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  var method = event.httpMethod || "POST";

  if (method === "OPTIONS") {
    return {
      isBase64Encoded: false,
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  if (method !== "POST") {
    return {
      isBase64Encoded: false,
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    var body = {};
    try {
      body = JSON.parse(event.body || "{}");
    } catch (e) {
      body = {};
    }

    var apiBody = {
      assistant_id: process.env.YUANQI_ASSISTANT_ID,
      user_id: body.user_id || "anonymous",
      stream: false,
      messages: body.messages || [],
    };

    var resp = await fetch(YUANQI_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.YUANQI_TOKEN,
        "X-Source": "openapi",
      },
      body: JSON.stringify(apiBody),
    });

    var data = await resp.json();

    if (!resp.ok) {
      return {
        isBase64Encoded: false,
        statusCode: resp.status,
        headers: Object.assign(corsHeaders, { "Content-Type": "application/json" }),
        body: JSON.stringify(data),
      };
    }

    // 提取完整回复内容，统一返回格式
    var content = "";
    if (data.choices && data.choices[0]) {
      var msg = data.choices[0].message || data.choices[0].delta || {};
      content = msg.content || "";
    }

    return {
      isBase64Encoded: false,
      statusCode: 200,
      headers: Object.assign(corsHeaders, { "Content-Type": "application/json" }),
      body: JSON.stringify({
        content: content,
        raw: data,
      }),
    };
  } catch (err) {
    return {
      isBase64Encoded: false,
      statusCode: 500,
      headers: Object.assign(corsHeaders, { "Content-Type": "application/json" }),
      body: JSON.stringify({ error: err.message }),
    };
  }
};
