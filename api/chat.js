/**
 * 腾讯元器 API 代理 - Vercel Serverless Function
 * POST /api/chat
 *
 * 环境变量（在 Vercel Project Settings → Environment Variables 中配置）:
 *   YUANQI_ASSISTANT_ID  - 腾讯元器智能体 appid
 *   YUANQI_TOKEN          - 腾讯元器 API Token (appkey)
 */

const YUANQI_API = "https://yuanqi.tencent.com/openapi/v1/agent/chat/completions";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body;

    const apiBody = {
      assistant_id: process.env.YUANQI_ASSISTANT_ID,
      user_id: body.user_id || "anonymous",
      stream: true,
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

    // 设置 SSE 响应头
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(resp.status);

    // 直接透传流式响应
    const reader = resp.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    };
    pump();
  } catch (err) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(500).json({ error: err.message });
  }
}
