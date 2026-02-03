import { google } from "googleapis";
import { decrypt } from "@/lib/encryption";

const SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.upload",
];

export function getOAuthClient(refreshToken?: string) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );

  if (refreshToken) {
    client.setCredentials({ refresh_token: refreshToken });
  }

  return client;
}

export function getGoogleAuthScopes() {
  return SCOPES.join(" ");
}

export async function fetchChannelStats(refreshTokenEncrypted: string) {
  const refreshToken = decrypt(refreshTokenEncrypted);
  const oauthClient = getOAuthClient(refreshToken);
  const youtube = google.youtube({ version: "v3", auth: oauthClient });

  const channelResponse = await youtube.channels.list({
    mine: true,
    part: ["snippet", "statistics", "contentDetails"],
  });

  const channel = channelResponse.data.items?.[0];
  if (!channel?.id || !channel.statistics) {
    throw new Error("No YouTube channel found");
  }

  const uploadsPlaylist = channel.contentDetails?.relatedPlaylists?.uploads;

  let uploads: Array<{ id: string; title: string; publishedAt: string }> = [];
  if (uploadsPlaylist) {
    const playlistResponse = await youtube.playlistItems.list({
      part: ["snippet"],
      maxResults: 10,
      playlistId: uploadsPlaylist,
    });

    uploads =
      playlistResponse.data.items?.map((item) => ({
        id: item.snippet?.resourceId?.videoId || "",
        title: item.snippet?.title || "",
        publishedAt: item.snippet?.publishedAt || "",
      })) || [];
  }

  return {
    youtubeChannelId: channel.id,
    title: channel.snippet?.title || "",
    subscriberCount: Number(channel.statistics.subscriberCount || 0),
    viewCount: Number(channel.statistics.viewCount || 0),
    uploads,
  };
}
