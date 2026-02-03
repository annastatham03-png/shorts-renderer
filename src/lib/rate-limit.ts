import { NextRequest } from "next/server";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;

const bucket = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.ip ||
    "unknown";
  const now = Date.now();
  const entry = bucket.get(ip);

  if (!entry || entry.resetAt < now) {
    bucket.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { success: true, remaining: MAX_REQUESTS - 1 };
  }

  if (entry.count >= MAX_REQUESTS) {
    return { success: false, remaining: 0, retryAt: entry.resetAt };
  }

  entry.count += 1;
  bucket.set(ip, entry);

  return { success: true, remaining: MAX_REQUESTS - entry.count };
}
