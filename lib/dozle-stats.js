import { get, list, put } from "@vercel/blob";
import { randomUUID } from "node:crypto";

const STATS_PATH = "dozle-fan/stats.json";
const MAX_DAYS = 60;
const MAX_RECENT = 40;
const EVENT_PREFIX = "dozle-fan/events/";

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

async function readCombinedStats() {
  // stats.json is the immutable migration baseline. New clicks are stored as
  // unique event blobs, so simultaneous visitors never overwrite one file.
  const { stats: base } = await readCurrent();
  const combined = normalizeStats(base);
  combined.daily = { ...combined.daily };
  const recent = [...combined.recent];
  let cursor;

  do {
    const page = await list({
      prefix: EVENT_PREFIX,
      limit: 1000,
      ...(cursor ? { cursor } : {}),
    });

    for (const blob of page.blobs ?? []) {
      const match = blob.pathname.match(
        /^dozle-fan\/events\/(\d{4}-\d{2}-\d{2})\/(view|cheer)-(\d+)-[a-f0-9-]+\.json$/i,
      );
      if (!match) continue;

      const [, day, type, timestamp] = match;
      const at = new Date(Number(timestamp));
      if (!Number.isFinite(at.getTime())) continue;

      if (type === "view") combined.totalViews += 1;
      else combined.totalCheers += 1;

      const row = combined.daily[day] && typeof combined.daily[day] === "object"
        ? {
            views: Number(combined.daily[day].views ?? 0),
            cheers: Number(combined.daily[day].cheers ?? 0),
          }
        : { views: 0, cheers: 0 };

      if (type === "view") row.views += 1;
      else row.cheers += 1;
      combined.daily[day] = row;
      recent.push({ type, at: at.toISOString() });
    }

    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  const days = Object.keys(combined.daily).sort();
  for (const oldDay of days.slice(0, Math.max(0, days.length - MAX_DAYS))) {
    delete combined.daily[oldDay];
  }

  combined.recent = recent
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, MAX_RECENT);

  return combined;
}

export async function recordDozleEvent(type) {
  if (type !== "view" && type !== "cheer") {
    throw new TypeError("Unsupported event type");
  }

  const now = new Date();
  const day = tokyoDate(now);
  const pathname =
    EVENT_PREFIX +
    day +
    "/" +
    type +
    "-" +
    now.getTime() +
    "-" +
    randomUUID() +
    ".json";

  // Each event gets a unique pathname. This is a single append-only write:
  // do not scan the event archive before accepting a click.
  await put(
    pathname,
    JSON.stringify({ type, at: now.toISOString() }),
    {
      access: "private",
      contentType: "application/json",
    },
  );

  // The browser updates the visible cheer count optimistically. The next GET
  // rebuilds authoritative totals from the baseline and immutable event files.
  return null;
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
  return makePublicStats(await readCombinedStats());
}

export async function getAdminDozleStats() {
  const stats = await readCombinedStats();
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
