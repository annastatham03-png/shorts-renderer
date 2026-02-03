import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { requireSessionUser } from "@/lib/session";
import { decrypt } from "@/lib/encryption";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const limit = rateLimit(request);
  if (!limit.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await requireSessionUser();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const contentItemId = formData.get("contentItemId")?.toString();
  const title = formData.get("title")?.toString();
  const description = formData.get("description")?.toString() || "";
  const file = formData.get("file");

  if (!contentItemId || !title || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing upload data" }, { status: 400 });
  }

  const contentItem = await prisma.contentQueueItem.findFirst({
    where: { id: contentItemId, userId: user.id },
  });

  if (!contentItem || contentItem.status !== "approved") {
    return NextResponse.json({ error: "Content item must be approved" }, { status: 400 });
  }

  const channel = await prisma.channel.findFirst({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  if (!channel) {
    return NextResponse.json({ error: "No channel connected" }, { status: 400 });
  }

  const refreshToken = decrypt(channel.refreshTokenEncrypted);
  const oauthClient = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
  oauthClient.setCredentials({ refresh_token: refreshToken });

  const youtube = google.youtube({ version: "v3", auth: oauthClient });
  const buffer = Buffer.from(await file.arrayBuffer());

  const uploadResponse = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title,
        description,
      },
      status: {
        privacyStatus: "private",
      },
    },
    media: {
      body: Readable.from(buffer),
    },
  });

  return NextResponse.json({ videoId: uploadResponse.data.id });
}
