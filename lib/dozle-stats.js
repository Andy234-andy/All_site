import { get, put } from "@vercel/blob";

const STATS_PATH = "dozle-fan/stats.json";
const MAX_DAYS = 60;
const MAX_RECENT = 40;

function tokyoDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function emptyStats() {
  return {
    version: 1,
    totalViews: 0,
    totalCheers: 0,
    daily: {},
    recent: [],
  };
}

function normalizeStats(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return emptyStats();
  const daily = value.daily && typeof value.daily === "object" && !Array.isArray(value.daily)
    ? value.daily
    : {};
  const recent = Array.isArray(value.recent) ? value.recent : [];
  return {
    version: 1,
    totalViews: Number.isSafeInteger(value.totalViews) && value.totalViews >= 0 ? value.totalViews : 0,
    totalCheers: Number.isSafeInteger(value.totalCheers) && value.totalCheers >= 0 ? value.totalCheers : 0,
    daily,
    recent: recent.slice(0, MAX_RECENT),
  };
}

async function readCurrent() {
  try {
    const result = await get(STATS_PATH, { access: "private" });
    if (!result || result.statusCode === 404) return { stats: emptyStats(), etag: null };
    const raw = await new Response(result.stream).text();
    return { stats: normalizeStats(JSON.parse(raw)), etag: result.blob?.etag ?? null };
  } catch (error) {
    if (error?.statusCode === 404 || error?.status === 404 || error?.name === "BlobNotFoundError") {
      return { stats: emptyStats(), etag: null };
    }
    throw error;
  }
}

function isWriteConflict(error) {
  return error?.statusCode === 409 ||
    error?.statusCode === 412 ||
    error?.status === 409 ||
    error?.status === 412 ||
    /precondition|already exists|already been taken|conflict/i.test(String(error?.message ?? ""));
}

function applyEvent(stats, type, now = new Date()) {
  const next = normalizeStats(stats);
  const day = tokyoDate(now);
  const row = next.daily[day] && typeof next.daily[day] === "object"
    ? { views: 0, cheers: 0, ...next.daily[day] }
    : { views: 0, cheers: 0 };

  if (type === "view") {
    next.totalViews += 1;
    row.views += 1;
  } else if (type === "cheer") {
    next.totalCheers += 1;
    row.cheers += 1;
  }

  next.daily[day] = row;
  const days = Object.keys(next.daily).sort();
  for (const oldDay of days.slice(0, Math.max(0, days.length - MAX_DAYS))) {
    delete next.daily[oldDay];
  }

  next.recent.unshift({
    type,
    at: now.toISOString(),
  });
  next.recent = next.recent.slice(0, MAX_RECENT);
  return next;
}

export async function recordDozleEvent(type) {
  if (type !== "view" && type !== "cheer") {
    throw new TypeError("Unsupported event type");
  }

  const maxAttempts = 12;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const current = await readCurrent();
    const next = applyEvent(current.stats, type);
    const options = {
      access: "private",
      contentType: "application/json",
      cacheControlMaxAge: 60,
    };

    try {
      if (current.etag) {
        await put(STATS_PATH, JSON.stringify(next), {
          ...options,
          allowOverwrite: true,
          ifMatch: current.etag,
        });
      } else {
        await put(STATS_PATH, JSON.stringify(next), options);
      }
      return makePublicStats(next);
    } catch (error) {
      if (!isWriteConflict(error)) throw error;

      // Add randomized exponential backoff so concurrent visitors do not
      // keep retrying at nearly the same time after an ETag conflict.
      if (attempt + 1 < maxAttempts) {
        const backoffCeiling = Math.min(500, 25 * 2 ** attempt);
        const jitter = Math.floor(Math.random() * (backoffCeiling + 1));
        await new Promise((resolve) => setTimeout(resolve, 20 + jitter));
      }
    }
  }

  const error = new Error("The shared counter is busy. Please retry.");
  error.statusCode = 503;
  throw error;
}

function makePublicStats(stats) {
  const today = tokyoDate();
  const todayRow = stats.daily[today] ?? {};
  return {
    totalViews: stats.totalViews,
    totalCheers: stats.totalCheers,
    todayViews: Number(todayRow.views ?? 0),
    todayCheers: Number(todayRow.cheers ?? 0),
  };
}

export async function getPublicDozleStats() {
  const { stats } = await readCurrent();
  return makePublicStats(stats);
}

export async function getAdminDozleStats() {
  const { stats } = await readCurrent();
  const today = tokyoDate();
  const daily = [];
  const now = new Date();

  for (let offset = 29; offset >= 0; offset -= 1) {
    const date = new Date(now.getTime() - offset * 24 * 60 * 60 * 1000);
    const key = tokyoDate(date);
    const row = stats.daily[key] ?? {};
    daily.push({
      date: key,
      views: Number(row.views ?? 0),
      cheers: Number(row.cheers ?? 0),
    });
  }

  return {
    ...makePublicStats(stats),
    daily,
    recent: stats.recent.slice(0, 25),
    updatedAt: new Date().toISOString(),
    note: "アクセス数は同じタブのセッションにつき1回。個人を特定する情報は保存していません。",
  };
}
