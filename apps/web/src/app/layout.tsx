import type { Metadata } from "next";
import { AppHeader } from "../components/app-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Support Platform",
  description: "AI customer support SaaS (portfolio project)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        <AppHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t bg-white py-6">
          <div className="mx-auto max-w-6xl px-4 text-xs text-zinc-500">
            Portfolio project — Local Docker MVP
          </div>
        </footer>
      </body>
    </html>
  );
}
