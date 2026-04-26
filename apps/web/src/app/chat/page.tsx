"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import type { ChatMessage } from "../../lib/types";

type Conversation = {
  id: string;
  title?: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  async function loadConversations() {
    const data = await apiFetch<Conversation[]>("/chat/conversations");
    setConversations(data);
    if (!activeId && data[0]?.id) setActiveId(data[0].id);
  }

  async function loadMessages(conversationId: string) {
    const data = await apiFetch<ChatMessage[]>(
      `/chat/conversations/${conversationId}/messages`,
    );
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
      const res = await apiFetch<{
        conversationId: string;
        message: ChatMessage;
      }>("/chat", {
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
    <div className="page-shell">
      <section>
        <div className="eyebrow">RAG console</div>
        <h1 className="page-title">Chat</h1>
        <p className="page-subtitle">
          Ask questions against processed documents and inspect citations saved
          with assistant messages.
        </p>
      </section>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
        <aside className="surface">
          <div className="mb-4 flex items-center justify-between">
            <div className="font-black tracking-[-0.03em]">Conversations</div>
            <span className="pill">{conversations.length}</span>
          </div>
          <div className="space-y-2">
            {conversations.map((c) => (
              <button
                key={c.id}
                className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${
                  c.id === activeId
                    ? "border-stone-950 bg-stone-950 text-white"
                    : "border-stone-300 bg-white/70 text-stone-700 hover:border-orange-400"
                }`}
                onClick={() => setActiveId(c.id)}
              >
                {c.title ?? c.id.slice(0, 8)}
              </button>
            ))}
            {conversations.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-stone-300 p-6 text-sm text-stone-600">
                No conversations yet. Send a message to create one.
              </div>
            ) : null}
          </div>
        </aside>

        <section className="surface-dark space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="eyebrow text-orange-300">Assistant</div>
              <h2 className="text-2xl font-black tracking-[-0.04em]">
                {active
                  ? `Conversation ${active.id.slice(0, 8)}`
                  : "New conversation"}
              </h2>
            </div>
          </div>
          {error ? <div className="error-box">{error}</div> : null}
          <div className="h-[520px] space-y-4 overflow-auto rounded-[1.5rem] border border-stone-800 bg-stone-900/70 p-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[88%] space-y-2 rounded-3xl p-4 ${
                  m.role === "USER"
                    ? "ml-auto bg-orange-600 text-white"
                    : "bg-[#fffaf0] text-stone-950"
                }`}
              >
                <div className="text-xs font-black uppercase tracking-[0.22em] opacity-70">
                  {m.role}
                </div>
                <div className="whitespace-pre-wrap text-sm leading-6">
                  {m.content}
                </div>
                {m.sources ? (
                  <pre className="overflow-auto rounded-2xl bg-stone-950/90 p-3 text-xs text-orange-100">
                    {JSON.stringify(m.sources, null, 2)}
                  </pre>
                ) : null}
              </div>
            ))}
            {messages.length === 0 ? (
              <div className="grid h-full place-items-center rounded-3xl border border-dashed border-stone-700 text-center text-sm text-stone-400">
                Ask something after uploading READY documents.
              </div>
            ) : null}
          </div>
          <div className="flex gap-3">
            <input
              className="field"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
            />
            <button
              className="btn-primary bg-orange-600 hover:bg-orange-500"
              onClick={send}
              disabled={loading}
            >
              {loading ? "..." : "Send"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
