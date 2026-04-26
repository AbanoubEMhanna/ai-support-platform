"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import type { TicketItem } from "../../lib/types";

const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

type Conversation = {
  id: string;
  title?: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function TicketsPage() {
  const [items, setItems] = useState<TicketItem[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState("");
  const [priority, setPriority] =
    useState<(typeof PRIORITIES)[number]>("MEDIUM");
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
      await apiFetch(`/tickets/${id}/status`, {
        method: "PATCH",
        body: { status },
      });
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
    <div className="page-shell">
      <section>
        <div className="eyebrow">Escalation desk</div>
        <h1 className="page-title">Tickets</h1>
        <p className="page-subtitle">
          Convert conversations into structured support work and track status
          through resolution.
        </p>
      </section>
      {error ? <div className="error-box">{error}</div> : null}

      <form className="surface-dark" onSubmit={createTicket}>
        <div className="eyebrow text-orange-300">Manual escalation</div>
        <h2 className="mt-2 text-3xl font-black tracking-[-0.05em]">
          Create ticket
        </h2>
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <label className="mt-5 space-y-2 text-sm">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-400">
              Conversation
            </span>
            <select
              className="field"
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
          <label className="mt-5 space-y-2 text-sm">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-400">
              Priority
            </span>
            <select
              className="field"
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as (typeof PRIORITIES)[number])
              }
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-4 block space-y-2 text-sm">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-400">
            Note
          </span>
          <textarea
            className="field min-h-28 resize-y"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What should a human support agent know?"
          />
        </label>
        <div className="mt-4 flex justify-end">
          <button
            className="btn-primary bg-orange-600 hover:bg-orange-500"
            disabled={creating || conversations.length === 0}
          >
            {creating ? "Creating..." : "Create ticket"}
          </button>
        </div>
      </form>

      <section className="surface">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="eyebrow">Queue</div>
            <h2 className="text-2xl font-black tracking-[-0.04em]">
              Active tickets
            </h2>
          </div>
          <span className="pill">{items.length} tickets</span>
        </div>
        <div className="grid gap-3">
          {items.map((t) => (
            <div
              key={t.id}
              className="space-y-3 rounded-3xl border border-stone-300 bg-white/70 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-lg font-black tracking-[-0.03em]">
                  #{t.id.slice(0, 8)}
                </div>
                <div className="pill">{t.priority}</div>
              </div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                Conversation: {t.conversationId}
              </div>
              {t.note ? (
                <div className="text-sm leading-6 text-stone-700">{t.note}</div>
              ) : null}
              <div className="flex items-center gap-2">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                  Status
                </div>
                <select
                  className="rounded-2xl border border-stone-300 bg-white px-3 py-2 text-sm font-bold"
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
          {items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-stone-300 p-8 text-sm text-stone-600">
              No tickets yet. Create one from an existing conversation.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
