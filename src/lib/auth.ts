import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { fetchChannelStats, getGoogleAuthScopes } from "@/lib/youtube";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope: getGoogleAuthScopes(),
        },
      },
    }),
  ],
  session: {
    strategy: "database",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.refresh_token) {
        const refreshTokenEncrypted = encrypt(account.refresh_token);
        try {
          const stats = await fetchChannelStats(refreshTokenEncrypted);
          await prisma.channel.upsert({
            where: {
              userId_youtubeChannelId: {
                userId: user.id,
                youtubeChannelId: stats.youtubeChannelId,
              },
            },
            update: {
              title: stats.title,
              subscriberCount: stats.subscriberCount,
              viewCount: stats.viewCount,
              lastUploads: stats.uploads,
              refreshTokenEncrypted,
            },
            create: {
              userId: user.id,
              youtubeChannelId: stats.youtubeChannelId,
              title: stats.title,
              subscriberCount: stats.subscriberCount,
              viewCount: stats.viewCount,
              lastUploads: stats.uploads,
              refreshTokenEncrypted,
            },
          });
        } catch (error) {
          console.error("Failed to sync YouTube channel", error);
        }
      }

      return true;
    },
  },
};
