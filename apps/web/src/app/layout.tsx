import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { MessagesPanelProvider } from "@/lib/messages-panel-context";
import { MessagesPanel } from "@/components/messages-panel";
import { ThemeProvider } from "@/components/theme-provider";
import { TopBar } from "@/components/top-bar";

export const metadata: Metadata = {
  title: "TrustLayer",
  description:
    "A trust and compatibility layer for online conversation — public identity, anonymous discovery, and reputation that measures interaction quality, not human worth.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground">
        <ThemeProvider>
          <AuthProvider>
            <MessagesPanelProvider>
              <TopBar />
              <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:pt-10">
                {children}
              </main>
              <MessagesPanel />
            </MessagesPanelProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
