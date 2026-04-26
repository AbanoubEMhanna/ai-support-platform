"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/documents", label: "Documents" },
  { href: "/chat", label: "Chat" },
  { href: "/tickets", label: "Tickets" },
  { href: "/settings", label: "Settings" },
];

export function AppHeader() {
  const router = useRouter();

  async function logout() {
    await apiFetch("/auth/logout", { method: "POST" }).catch(() => undefined);
    router.push("/login");
  }

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex min-h-14 max-w-6xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <Link className="font-semibold" href="/">
          AI Support
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm">
          {navItems.map((item) => (
            <Link key={item.href} className="hover:underline" href={item.href}>
              {item.label}
            </Link>
          ))}
          <Link className="hover:underline" href="/login">
            Login
          </Link>
          <button className="rounded-md border px-3 py-1 text-sm" onClick={logout}>
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}
