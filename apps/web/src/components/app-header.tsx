"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();

  async function logout() {
    await apiFetch("/auth/logout", { method: "POST" }).catch(() => undefined);
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-stone-300/70 bg-[#fffaf0]/80 backdrop-blur-xl">
      <div className="mx-auto flex min-h-20 max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
        <Link className="group flex items-center gap-3" href="/">
          <span className="grid size-11 place-items-center rounded-2xl bg-stone-950 text-sm font-black text-orange-200 shadow-lg transition group-hover:rotate-[-6deg]">
            AI
          </span>
          <span>
            <span className="block text-lg font-black tracking-[-0.04em]">
              Support Foundry
            </span>
            <span className="block text-[11px] font-bold uppercase tracking-[0.22em] text-stone-500">
              Local RAG SaaS
            </span>
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-2 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              className={`rounded-full px-4 py-2 font-bold transition ${
                pathname === item.href
                  ? "bg-stone-950 text-white shadow-lg"
                  : "text-stone-600 hover:bg-white/80 hover:text-stone-950"
              }`}
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
          <Link
            className="rounded-full px-4 py-2 font-bold text-stone-600 transition hover:bg-white/80 hover:text-stone-950"
            href="/login"
          >
            Login
          </Link>
          <button className="btn-secondary px-4 py-2" onClick={logout}>
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}
