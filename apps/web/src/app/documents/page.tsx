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
      if (!res.ok || !json?.success) throw new Error(json?.error?.message ?? "Upload failed");
      fileRef.current!.value = "";
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Documents</h1>
      {error ? <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="rounded-lg border bg-white p-4 space-y-2">
        <div className="font-medium">Upload</div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <input ref={fileRef} type="file" className="text-sm" accept=".txt,.pdf" />
          <button
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-60"
            onClick={upload}
            disabled={loading}
          >
            {loading ? "Uploading..." : "Upload"}
          </button>
        </div>
        <div className="text-xs text-zinc-500">Supported: TXT, PDF. Max 10MB.</div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="mb-3 font-medium">Your documents</div>
        <div className="space-y-2">
          {items.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{d.originalName}</div>
                <div className="text-xs text-zinc-500">{d.mimeType} • {d.size} bytes</div>
                {d.errorMessage ? <div className="text-xs text-red-700">{d.errorMessage}</div> : null}
              </div>
              <div className="text-xs font-medium">{d.status}</div>
            </div>
          ))}
          {items.length === 0 ? <div className="text-sm text-zinc-600">No documents yet.</div> : null}
        </div>
      </div>
    </div>
  );
}

