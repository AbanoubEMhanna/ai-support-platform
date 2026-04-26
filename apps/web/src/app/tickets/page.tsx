"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import type { TicketItem } from "../../lib/types";

const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

type Conversation = { id: string; title?: string | null; createdAt: string; updatedAt: string };

export default function TicketsPage() {
  const [items, setItems] = useState<TicketItem[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState("");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>("MEDIUM");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const [tickets, convos] = await Promise.all([
      apiFetch<TicketItem[]>("/tickets"),
      apiFetch<Conversation[]>("/chat/conversations"),
    ]);
    setItems(tickets);
    setConversations(convos);
    if (!conversationId && convos[0]?.id) setConversationId(convos[0].id);
  }, [conversationId]);

  useEffect(() => {
    load().catch((err) => setError(err?.message ?? "Failed to load tickets"));
  }, [load]);

  async function updateStatus(id: string, status: string) {
    try {
      setError(null);
      await apiFetch(`/tickets/${id}/status`, { method: "PATCH", body: { status } });
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Update failed");
    }
  }

  async function createTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!conversationId) {
      setError("Create a chat conversation first");
      return;
    }

    try {
      setCreating(true);
      setError(null);
      await apiFetch("/tickets", {
        method: "POST",
        body: {
          conversationId,
          priority,
          note: note.trim() || undefined,
        },
      });
      setNote("");
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Create ticket failed");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Tickets</h1>
      {error ? <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <form className="rounded-lg border bg-white p-4" onSubmit={createTicket}>
        <div className="mb-3 font-medium">Create ticket</div>
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <label className="space-y-1 text-sm">
            <span className="text-xs text-zinc-500">Conversation</span>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={conversationId}
              onChange={(e) => setConversationId(e.target.value)}
            >
              {conversations.map((conversation) => (
                <option key={conversation.id} value={conversation.id}>
                  {conversation.title ?? conversation.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs text-zinc-500">Priority</span>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={priority}
              onChange={(e) => setPriority(e.target.value as (typeof PRIORITIES)[number])}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-3 block space-y-1 text-sm">
          <span className="text-xs text-zinc-500">Note</span>
          <textarea
            className="min-h-24 w-full resize-y rounded-md border px-3 py-2 text-sm"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What should a human support agent know?"
          />
        </label>
        <div className="mt-3 flex justify-end">
          <button
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60"
            disabled={creating || conversations.length === 0}
          >
            {creating ? "Creating..." : "Create ticket"}
          </button>
        </div>
      </form>

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
    </div>
  );
}
