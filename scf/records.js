/**
 * 飞书记录读取 - 腾讯云函数 SCF 版
 * GET，返回所有记录
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

  var method = event.httpMethod || "GET";

  if (method === "OPTIONS") {
    return {
      isBase64Encoded: false,
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  if (method !== "GET") {
    return {
      isBase64Encoded: false,
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
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
    var allRecords = [];
    var pageToken = null;

    do {
      var url =
        FEISHU_BASE +
        "/bitable/v1/apps/" +
        process.env.FEISHU_APP_TOKEN +
        "/tables/" +
        process.env.FEISHU_TABLE_ID +
        "/records?page_size=500";
      if (pageToken) url += "&page_token=" + pageToken;

      var resp = await fetch(url, {
        headers: { Authorization: "Bearer " + token },
      });

      var data = await resp.json();
      if (data.code !== 0) {
        throw new Error("读取记录失败: " + (data.msg || ""));
      }

      if (data.data && data.data.items) {
        for (var i = 0; i < data.data.items.length; i++) {
          var item = data.data.items[i];
          var f = item.fields || {};
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

    return {
      isBase64Encoded: false,
      statusCode: 200,
      headers: Object.assign(corsHeaders, { "Content-Type": "application/json" }),
      body: JSON.stringify({ records: allRecords }),
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
