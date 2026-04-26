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
    try {
      setError(null);
      await apiFetch("/organizations", { method: "POST", body: { name } });
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
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      {error ? <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="rounded-lg border bg-white p-4 space-y-2">
        <div className="font-medium">Organizations</div>
        <div className="space-y-2">
          {orgs.map((o) => (
            <div key={o.organization.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div>
                <div className="text-sm font-medium">{o.organization.name}</div>
                <div className="text-xs text-zinc-500">Role: {o.role}</div>
              </div>
              <button className="rounded-md border px-3 py-1 text-sm" onClick={() => switchOrg(o.organization.id)}>
                Switch
              </button>
            </div>
          ))}
          {orgs.length === 0 ? <div className="text-sm text-zinc-600">No organizations yet.</div> : null}
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4 space-y-2">
        <div className="font-medium">Create organization</div>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Org name"
          />
          <button className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-white" onClick={createOrg}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

