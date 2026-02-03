import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YouTube Channel Dashboard",
  description: "Free-tier optimized YouTube channel dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <h1>YouTube Channel Dashboard</h1>
          <nav>
            <a href="/dashboard">Dashboard</a>
            <a href="/content-queue">Content Queue</a>
            <a href="/upload-center">Upload Center</a>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
