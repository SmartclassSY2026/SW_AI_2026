/**
 * 飞书记录写入 - 腾讯云函数 SCF 版
 * POST，body 传 student_name / student_id / question / answer / type
 *
 * 环境变量:
 *   FEISHU_APP_ID         - 飞书应用 App ID
 *   FEISHU_APP_SECRET      - 飞书应用 App Secret
 *   FEISHU_APP_TOKEN       - 多维表格 App Token
 *   FEISHU_TABLE_ID        - 多维表格 Table ID
 */

const FEISHU_BASE = "https://open.feishu.cn/open-apis";

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

    // 获取飞书 tenant_access_token
    var tokenResp = await fetch(FEISHU_BASE + "/auth/v3/tenant_access_token/internal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: process.env.FEISHU_APP_ID,
        app_secret: process.env.FEISHU_APP_SECRET,
      }),
    });

    var tokenData = await tokenResp.json();
    if (tokenData.code !== 0) {
      throw new Error("获取飞书token失败: " + (tokenData.msg || ""));
    }

    var token = tokenData.tenant_access_token;

    // 写入多维表格记录
    var url =
      FEISHU_BASE +
      "/bitable/v1/apps/" +
      process.env.FEISHU_APP_TOKEN +
      "/tables/" +
      process.env.FEISHU_TABLE_ID +
      "/records";

    var fields = {
      "学生姓名": body.student_name || "",
      "学号": body.student_id || "",
      "问题": body.question || "",
      "回答": (body.answer || "").substring(0, 1000),
      "类型": body.type || "对话",
      "时间": Date.now(),
    };

    var resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ fields: fields }),
    });

    var data = await resp.json();
    if (data.code !== 0) {
      throw new Error("写入记录失败: " + (data.msg || ""));
    }

    return {
      isBase64Encoded: false,
      statusCode: 200,
      headers: Object.assign(corsHeaders, { "Content-Type": "application/json" }),
      body: JSON.stringify({ success: true }),
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
