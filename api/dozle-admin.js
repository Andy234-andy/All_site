import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { getAdminDozleStats } from "../lib/dozle-stats.js";

const COOKIE_NAME = "dozle_admin";
const SESSION_SECONDS = 12 * 60 * 60;

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
    if (raw.length > 3000) throw new Error("Request body too large");
  }
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

function cookieValue(req, name) {
  const cookies = String(req.headers.cookie || "").split(";");
  for (const item of cookies) {
    const [key, ...rest] = item.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return "";
}

function sessionSignature(expiry) {
  const secret = process.env.DOZLE_ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("Admin session secret is not configured");
  return createHmac("sha256", secret).update(String(expiry)).digest("base64url");
}

function hasAdminSession(req) {
  try {
    const token = cookieValue(req, COOKIE_NAME);
    const [expiryText, signature] = token.split(".");
    const expiry = Number(expiryText);
    if (!Number.isFinite(expiry) || expiry <= Math.floor(Date.now() / 1000) || !signature) return false;
    const expected = Buffer.from(sessionSignature(expiry), "utf8");
    const received = Buffer.from(signature, "utf8");
    return expected.length === received.length && timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}

function passwordMatches(password) {
  const expectedPassword = process.env.DOZLE_ADMIN_PASSWORD;
  if (!expectedPassword || typeof password !== "string") return false;
  const expected = createHash("sha256").update(expectedPassword).digest();
  const received = createHash("sha256").update(password).digest();
  return timingSafeEqual(expected, received);
}

export default async function handler(req, res) {
  const action = String(req.query?.action || "");

  if (req.method === "POST" && !isSameOrigin(req)) {
    return send(res, 403, { ok: false, error: "同じサイトからのみ操作できます。" });
  }

  if (req.method === "POST" && action === "login") {
    try {
      const body = await readBody(req);
      if (!passwordMatches(body.password)) {
        return send(res, 401, { ok: false, error: "パスワードが違います。" });
      }

      const expiry = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
      const signature = sessionSignature(expiry);
      res.setHeader("Set-Cookie", `${COOKIE_NAME}=${expiry}.${signature}; Path=/api/dozle-admin; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Strict`);
      return send(res, 200, { ok: true });
    } catch (error) {
      console.error("Dozle admin login error:", error);
      return send(res, 500, { ok: false, error: "ログインを処理できませんでした。" });
    }
  }

  if (req.method === "POST" && action === "logout") {
    res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/api/dozle-admin; Max-Age=0; HttpOnly; Secure; SameSite=Strict`);
    return send(res, 200, { ok: true });
  }

  if (req.method === "GET" && action === "stats") {
    if (!hasAdminSession(req)) {
      return send(res, 401, { ok: false, error: "ログインしてください。" });
    }
    try {
      const stats = await getAdminDozleStats();
      return send(res, 200, { ok: true, stats });
    } catch (error) {
      console.error("Dozle admin stats error:", error);
      return send(res, 503, { ok: false, error: "統計データを読み込めませんでした。" });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return send(res, 404, { ok: false, error: "Not found" });
}
