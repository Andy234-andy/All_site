import { getPublicDozleStats, recordDozleEvent } from "../lib/dozle-stats.js";

function send(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  return res.end(JSON.stringify(payload));
}

function isSameOrigin(req) {
  const origin = req.headers.origin;
  const host = req.headers.host || req.headers["x-forwarded-host"];
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === String(host).split(",")[0].trim();
  } catch {
    return false;
  }
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 2000) throw new Error("Request body too large");
  }
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const stats = await getPublicDozleStats();
      return send(res, 200, { ok: true, stats });
    } catch (error) {
      console.error("Dozle public stats error:", error);
      return send(res, 503, { ok: false, error: "集計を読み込めませんでした。" });
    }
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return send(res, 405, { ok: false, error: "Method not allowed" });
  }

  if (!isSameOrigin(req)) {
    return send(res, 403, { ok: false, error: "同じサイトからのみ送信できます。" });
  }

  try {
    const body = await readBody(req);
    const action = body.action;
    if (action !== "view" && action !== "cheer") {
      return send(res, 400, { ok: false, error: "Invalid action" });
    }

    const stats = await recordDozleEvent(action);
    return send(res, 200, { ok: true, stats });
  } catch (error) {
    console.error("Dozle event error:", error);
    const status = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    return send(res, status, {
      ok: false,
      error: status === 503 ? "応援が集中しています。少ししてからもう一度押してね。" : "記録に失敗しました。通信を確認してね。",
    });
  }
}
