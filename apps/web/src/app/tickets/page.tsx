"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import type { TicketItem } from "../../lib/types";

const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

export default function TicketsPage() {
  const [items, setItems] = useState<TicketItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await apiFetch<TicketItem[]>("/tickets");
    setItems(data);
  }

  useEffect(() => {
    load().catch((err) => setError(err?.message ?? "Failed to load tickets"));
  }, []);

  async function updateStatus(id: string, status: string) {
    try {
      setError(null);
      await apiFetch(`/tickets/${id}/status`, { method: "PATCH", body: { status } });
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Update failed");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Tickets</h1>
      {error ? <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      <div className="rounded-lg border bg-white p-4">
        <div className="space-y-2">
          {items.map((t) => (
            <div key={t.id} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">{t.id.slice(0, 8)}</div>
                <div className="text-xs">{t.priority}</div>
              </div>
              <div className="text-xs text-zinc-500">Conversation: {t.conversationId}</div>
              {t.note ? <div className="text-sm">{t.note}</div> : null}
              <div className="flex items-center gap-2">
                <div className="text-xs text-zinc-500">Status:</div>
                <select
                  className="rounded-md border px-2 py-1 text-sm"
                  value={t.status}
                  onChange={(e) => updateStatus(t.id, e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
          {items.length === 0 ? <div className="text-sm text-zinc-600">No tickets yet.</div> : null}
        </div>
      </div>
      <div className="text-sm text-zinc-600">
        Create a ticket from the API (POST <code>/tickets</code>) after you have a conversation.
      </div>
    </div>
  );
}

