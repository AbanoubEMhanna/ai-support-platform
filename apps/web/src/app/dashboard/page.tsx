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
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      {error ? <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Card title="Total Documents" value={String(documents.length)} />
        <Card title="Ready Documents" value={String(readyDocs)} />
        <Card title="Open Tickets" value={String(openTickets)} />
        <Card title="Total Tickets" value={String(tickets.length)} />
      </div>
      <div className="text-sm text-zinc-600">
        Tip: create/switch an org from <a className="underline" href="/settings">Settings</a> first.
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-xs text-zinc-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

