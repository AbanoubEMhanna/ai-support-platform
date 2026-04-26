"use client";

import { useCallback, useEffect, useState } from "react";
import {
  defaultModel,
  getAiModelSettings,
  setAiModelSettings,
} from "../../lib/ai-settings";
import { apiFetch } from "../../lib/api";
import type { AiModel, AiProvider, OrganizationItem } from "../../lib/types";

const AI_PROVIDERS: Array<{ value: AiProvider; label: string; hint: string }> =
  [
    {
      value: "openai",
      label: "OpenAI",
      hint: "Cloud default. Requires OPENAI_API_KEY for generation.",
    },
    {
      value: "ollama",
      label: "Ollama",
      hint: "Reads local models from OLLAMA_BASE_URL /api/tags.",
    },
    {
      value: "lmstudio",
      label: "LM Studio",
      hint: "Reads OpenAI-compatible models from LM_STUDIO_BASE_URL /v1/models.",
    },
  ];

export default function SettingsPage() {
  const [orgs, setOrgs] = useState<OrganizationItem[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [provider, setProvider] = useState<AiProvider>("openai");
  const [model, setModel] = useState("gpt-4.1-mini");
  const [models, setModels] = useState<AiModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  async function load() {
    try {
      setError(null);
      const data = await apiFetch<OrganizationItem[]>("/organizations");
      setOrgs(data);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load orgs");
    }
  }

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

  const loadModels = useCallback(async (nextProvider: AiProvider) => {
    try {
      setLoadingModels(true);
      setModelError(null);
      const data = await apiFetch<AiModel[]>(
        `/ai/models?provider=${nextProvider}`,
      );
      setModels(data);
      setModel((currentModel) => {
        if (data.some((item) => item.id === currentModel)) return currentModel;
        return data[0]?.id ?? defaultModel(nextProvider);
      });
    } catch (err: any) {
      setModels([]);
      setModelError(err?.message ?? "Failed to load models");
    } finally {
      setLoadingModels(false);
    }
  }, []);

  useEffect(() => {
    load();
    const settings = getAiModelSettings();
    setProvider(settings.provider);
    setModel(settings.model);
  }, []);

  useEffect(() => {
    loadModels(provider);
  }, [provider, loadModels]);

  function saveModelSettings() {
    setAiModelSettings({ provider, model });
    setModelError(null);
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

      <section className="surface">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="eyebrow">AI runtime</div>
            <h2 className="text-2xl font-black tracking-[-0.04em]">
              Chat model selection
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Pick OpenAI, Ollama, or LM Studio. The choice is saved in this
              browser and sent with every chat request.
            </p>
          </div>
          <button
            className="btn-secondary"
            onClick={() => loadModels(provider)}
          >
            {loadingModels ? "Loading..." : "Refresh models"}
          </button>
        </div>
        {modelError ? <div className="error-box mb-4">{modelError}</div> : null}
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="space-y-3">
            {AI_PROVIDERS.map((item) => (
              <button
                key={item.value}
                className={`w-full rounded-3xl border p-4 text-left transition ${
                  provider === item.value
                    ? "border-stone-950 bg-stone-950 text-white"
                    : "border-stone-300 bg-white/70 text-stone-900 hover:border-orange-400"
                }`}
                onClick={() => {
                  setProvider(item.value);
                  setModel(defaultModel(item.value));
                }}
              >
                <div className="font-black tracking-[-0.03em]">
                  {item.label}
                </div>
                <div
                  className={`mt-1 text-xs leading-5 ${
                    provider === item.value
                      ? "text-stone-300"
                      : "text-stone-500"
                  }`}
                >
                  {item.hint}
                </div>
              </button>
            ))}
          </div>

          <div className="rounded-3xl border border-stone-300 bg-white/70 p-4">
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                Model
              </span>
              <select
                className="field"
                value={model}
                onChange={(event) => setModel(event.target.value)}
              >
                {models.length > 0 ? (
                  models.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {item.details ? ` — ${item.details}` : ""}
                    </option>
                  ))
                ) : (
                  <option value={model}>{model || "No models found"}</option>
                )}
              </select>
            </label>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
              <input
                className="field"
                value={model}
                onChange={(event) => setModel(event.target.value)}
                placeholder={
                  provider === "ollama"
                    ? "llama3.2:latest"
                    : provider === "lmstudio"
                      ? "loaded-model-id"
                      : "gpt-4.1-mini"
                }
              />
              <button
                className="btn-primary"
                onClick={saveModelSettings}
                disabled={!model.trim()}
              >
                Save model
              </button>
            </div>
            <div className="mt-4 rounded-2xl bg-stone-100 p-3 font-mono text-xs text-stone-600">
              Current: {provider} / {model || "not selected"}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
