"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import type { DocumentItem, TicketItem } from "../../lib/types";

export default function DashboardPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      const [docs, tks] = await Promise.all([
        apiFetch<DocumentItem[]>("/documents"),
        apiFetch<TicketItem[]>("/tickets"),
      ]);
      setDocuments(docs);
      setTickets(tks);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load dashboard");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const readyDocs = documents.filter((d) => d.status === "READY").length;
  const openTickets = tickets.filter((t) => t.status === "OPEN").length;

  return (
    <div className="page-shell">
      <section className="surface-dark">
        <div className="eyebrow text-orange-300">Control room</div>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-[-0.05em] text-white md:text-6xl">
              Dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-300">
              Quick operational readout for documents, RAG readiness, and
              support escalation.
            </p>
          </div>
          <a
            className="btn-primary bg-orange-600 hover:bg-orange-500"
            href="/settings"
          >
            Set active org
          </a>
        </div>
      </section>
      {error ? <div className="error-box">{error}</div> : null}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card
          title="Total Documents"
          value={String(documents.length)}
          tone="dark"
        />
        <Card title="Ready Documents" value={String(readyDocs)} />
        <Card title="Open Tickets" value={String(openTickets)} />
        <Card title="Total Tickets" value={String(tickets.length)} />
      </div>
      <div className="surface flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-black tracking-[-0.03em]">Start here</div>
          <div className="text-sm text-stone-600">
            Create or switch an organization before uploading documents or
            chatting.
          </div>
        </div>
        <a className="btn-secondary" href="/settings">
          Open settings
        </a>
      </div>
    </div>
  );
}

function Card({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone?: "dark";
}) {
  return (
    <div className={tone === "dark" ? "surface-dark" : "surface"}>
      <div
        className={
          tone === "dark"
            ? "text-xs font-bold uppercase tracking-[0.2em] text-orange-300"
            : "text-xs font-bold uppercase tracking-[0.2em] text-stone-500"
        }
      >
        {title}
      </div>
      <div className="mt-4 text-5xl font-black tracking-[-0.06em]">{value}</div>
    </div>
  );
}
