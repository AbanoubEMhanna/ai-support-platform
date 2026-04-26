"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import type { OrganizationItem } from "../../lib/types";

export default function SettingsPage() {
  const [orgs, setOrgs] = useState<OrganizationItem[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      const data = await apiFetch<OrganizationItem[]>("/organizations");
      setOrgs(data);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load orgs");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createOrg() {
    if (name.trim().length < 2) {
      setError("Organization name must be at least 2 characters");
      return;
    }
    try {
      setError(null);
      await apiFetch("/organizations", {
        method: "POST",
        body: { name: name.trim() },
      });
      setName("");
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Failed to create org");
    }
  }

  async function switchOrg(id: string) {
    try {
      setError(null);
      await apiFetch(`/organizations/${id}/switch`, { method: "POST" });
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Failed to switch");
    }
  }

  return (
    <div className="page-shell">
      <section>
        <div className="eyebrow">Workspace</div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">
          Manage organization membership and choose the active tenant for
          documents, chat, and tickets.
        </p>
      </section>
      {error ? <div className="error-box">{error}</div> : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <section className="surface">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="eyebrow">Tenants</div>
              <h2 className="text-2xl font-black tracking-[-0.04em]">
                Organizations
              </h2>
            </div>
            <span className="pill">{orgs.length} total</span>
          </div>
          <div className="space-y-3">
            {orgs.map((o) => (
              <div
                key={o.organization.id}
                className="flex items-center justify-between gap-4 rounded-3xl border border-stone-300 bg-white/70 p-4"
              >
                <div>
                  <div className="text-lg font-black tracking-[-0.03em]">
                    {o.organization.name}
                  </div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                    Role: {o.role}
                  </div>
                </div>
                <button
                  className="btn-secondary px-4 py-2"
                  onClick={() => switchOrg(o.organization.id)}
                >
                  Switch
                </button>
              </div>
            ))}
            {orgs.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-stone-300 p-8 text-sm text-stone-600">
                No organizations yet. Create one to activate tenant-scoped
                documents, chat, and tickets.
              </div>
            ) : null}
          </div>
        </section>

        <section className="surface-dark">
          <div className="eyebrow text-orange-300">New tenant</div>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-white">
            Create organization
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-300">
            Creation also switches your active JWT organization context.
          </p>
          <div className="mt-6 space-y-3">
            <input
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Org name"
              onKeyDown={(e) => {
                if (e.key === "Enter") createOrg();
              }}
            />
            <button
              className="btn-primary w-full bg-orange-600 hover:bg-orange-500"
              onClick={createOrg}
            >
              Create
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
