"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import type { ChatMessage } from "../../lib/types";

type Conversation = { id: string; title?: string | null; createdAt: string; updatedAt: string };

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const active = useMemo(() => conversations.find((c) => c.id === activeId) ?? null, [conversations, activeId]);

  async function loadConversations() {
    const data = await apiFetch<Conversation[]>("/chat/conversations");
    setConversations(data);
    if (!activeId && data[0]?.id) setActiveId(data[0].id);
  }

  async function loadMessages(conversationId: string) {
    const data = await apiFetch<ChatMessage[]>(`/chat/conversations/${conversationId}/messages`);
    setMessages(data);
  }

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        await loadConversations();
      } catch (err: any) {
        setError(err?.message ?? "Failed to load chat");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeId) return;
    loadMessages(activeId).catch(() => undefined);
  }, [activeId]);

  async function send() {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ conversationId: string; message: ChatMessage }>("/chat", {
        method: "POST",
        body: { message: input, conversationId: activeId ?? undefined },
      });
      setInput("");
      setActiveId(res.conversationId);
      await loadConversations();
      await loadMessages(res.conversationId);
    } catch (err: any) {
      setError(err?.message ?? "Send failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
      <div className="rounded-lg border bg-white p-3">
        <div className="mb-2 text-sm font-medium">Conversations</div>
        <div className="space-y-2">
          {conversations.map((c) => (
            <button
              key={c.id}
              className={`w-full rounded-md border px-3 py-2 text-left text-sm ${c.id === activeId ? "bg-zinc-50" : ""}`}
              onClick={() => setActiveId(c.id)}
            >
              {c.title ?? c.id.slice(0, 8)}
            </button>
          ))}
          {conversations.length === 0 ? (
            <div className="text-sm text-zinc-600">No conversations yet.</div>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4 space-y-3">
        <div className="text-sm font-medium">Chat {active ? `— ${active.id.slice(0, 8)}` : ""}</div>
        {error ? <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
        <div className="h-[420px] overflow-auto rounded-md border p-3 space-y-3">
          {messages.map((m) => (
            <div key={m.id} className="space-y-1">
              <div className="text-xs font-medium text-zinc-500">{m.role}</div>
              <div className="whitespace-pre-wrap text-sm">{m.content}</div>
              {m.sources ? (
                <pre className="overflow-auto rounded bg-zinc-50 p-2 text-xs text-zinc-700">
                  {JSON.stringify(m.sources, null, 2)}
                </pre>
              ) : null}
            </div>
          ))}
          {messages.length === 0 ? <div className="text-sm text-zinc-600">No messages yet.</div> : null}
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border px-3 py-2 text-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
          />
          <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60" onClick={send} disabled={loading}>
            {loading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

