import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchChannelStats } from "@/lib/youtube";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

function getSnapshotDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(request);
  if (!limit.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const secret = request.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.SNAPSHOT_CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const channels = await prisma.channel.findMany();
  const snapshotDate = getSnapshotDate();

  const results = [] as Array<{ channelId: string; status: string }>;

  for (const channel of channels) {
    try {
      const stats = await fetchChannelStats(channel.refreshTokenEncrypted);
      await prisma.channel.update({
        where: { id: channel.id },
        data: {
          title: stats.title,
          subscriberCount: stats.subscriberCount,
          viewCount: stats.viewCount,
          lastUploads: stats.uploads,
        },
      });

      await prisma.dailySnapshot.upsert({
        where: {
          channelId_snapshotDate: {
            channelId: channel.id,
            snapshotDate,
          },
        },
        update: {
          subscriberCount: stats.subscriberCount,
          viewCount: stats.viewCount,
        },
        create: {
          channelId: channel.id,
          snapshotDate,
          subscriberCount: stats.subscriberCount,
          viewCount: stats.viewCount,
        },
      });
      results.push({ channelId: channel.id, status: "ok" });
    } catch (error) {
      console.error("Snapshot failed", error);
      results.push({ channelId: channel.id, status: "error" });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
