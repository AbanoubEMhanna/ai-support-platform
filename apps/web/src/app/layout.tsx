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
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body
        className="flex min-h-full flex-col text-stone-950"
        suppressHydrationWarning
      >
        <AppHeader />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6 md:py-10">
          {children}
        </main>
        <footer className="border-t border-stone-300/70 bg-[#fffaf0]/70 py-7 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 text-xs text-stone-500 md:flex-row md:items-center md:justify-between md:px-6">
            <span>Portfolio project — Local Docker MVP</span>
            <span>NestJS · Next.js · Postgres/pgvector · RabbitMQ</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
