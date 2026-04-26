"use client";

import { useEffect, useRef, useState } from "react";
import { API_URL, apiFetch } from "../../lib/api";
import type { DocumentItem } from "../../lib/types";

export default function DocumentsPage() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      setError(null);
      const docs = await apiFetch<DocumentItem[]>("/documents");
      setItems(docs);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load documents");
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 2000);
    return () => clearInterval(id);
  }, []);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_URL}/documents/upload`, {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json?.success)
        throw new Error(json?.error?.message ?? "Upload failed");
      fileRef.current!.value = "";
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell">
      <section>
        <div className="eyebrow">Knowledge base</div>
        <h1 className="page-title">Documents</h1>
        <p className="page-subtitle">
          Upload support knowledge, watch worker processing status, and make it
          available for RAG retrieval.
        </p>
      </section>
      {error ? <div className="error-box">{error}</div> : null}

      <section className="surface-dark">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="eyebrow text-orange-300">Ingestion</div>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.05em]">
              Upload source material
            </h2>
            <p className="mt-2 text-sm text-stone-300">
              TXT/PDF only · max 10MB · processed asynchronously by the worker.
            </p>
          </div>
          <div className="flex flex-col gap-3 md:min-w-[420px] md:flex-row md:items-center">
            <input
              ref={fileRef}
              type="file"
              className="field bg-white text-stone-950"
              accept=".txt,.pdf"
            />
            <button
              className="btn-primary bg-orange-600 hover:bg-orange-500"
              onClick={upload}
              disabled={loading}
            >
              {loading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
      </section>

      <section className="surface">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="eyebrow">Library</div>
            <h2 className="text-2xl font-black tracking-[-0.04em]">
              Your documents
            </h2>
          </div>
          <span className="pill">{items.length} files</span>
        </div>
        <div className="grid gap-3">
          {items.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between gap-4 rounded-3xl border border-stone-300 bg-white/70 p-4"
            >
              <div className="min-w-0">
                <div className="truncate text-lg font-black tracking-[-0.03em]">
                  {d.originalName}
                </div>
                <div className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                  {d.mimeType} · {d.size} bytes
                </div>
                {d.errorMessage ? (
                  <div className="mt-2 text-xs text-red-700">
                    {d.errorMessage}
                  </div>
                ) : null}
              </div>
              <StatusBadge status={d.status} />
            </div>
          ))}
          {items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-stone-300 p-8 text-sm text-stone-600">
              No documents yet. Upload a TXT or PDF to start the async pipeline.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "READY"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "FAILED"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-orange-200 bg-orange-50 text-orange-700";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-black ${tone}`}
    >
      {status}
    </span>
  );
}
