import type { Metadata, Viewport } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { ClientShell } from "@/components/ClientShell";
import SessionWrapper from "@/components/SessionWrapper";
import TopBar from "@/components/TopBar";
import UsernameGuard from "@/components/UsernameGuard";

export const viewport: Viewport = {
  themeColor: "#1a1a1a",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "BnC – Bulls & Cows",
  description:
    "Challenge your logic with the modern take on the classic Bulls & Cows code-breaking game. ELO rankings, daily puzzles, rooms, and tournaments.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" style={{ background: "#1a1a1a" }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body
        style={{
          background: "#1a1a1a",
          color: "white",
          minHeight: "100vh",
          display: "flex",
          margin: 0,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        <SessionWrapper>
          <UsernameGuard>
            <Sidebar />
            <main
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                marginLeft: "160px",
                minHeight: "100vh",
              }}
            >
              <TopBar />
              <ClientShell>{children}</ClientShell>
            </main>
          </UsernameGuard>
        </SessionWrapper>
      </body>
    </html>
  );
}
