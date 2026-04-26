"use client";

import type { AiProvider } from "./types";

export const AI_SETTINGS_KEY = "ai-support:model-settings";

export type AiModelSettings = {
  provider: AiProvider;
  model: string;
};

export function getAiModelSettings(): AiModelSettings {
  if (typeof window === "undefined") {
    return { provider: "openai", model: "gpt-4.1-mini" };
  }

  const raw = window.localStorage.getItem(AI_SETTINGS_KEY);
  if (!raw) return { provider: "openai", model: "gpt-4.1-mini" };

  try {
    const parsed = JSON.parse(raw) as Partial<AiModelSettings>;
    const provider = isAiProvider(parsed.provider) ? parsed.provider : "openai";
    const model = typeof parsed.model === "string" ? parsed.model : "";
    return { provider, model: model || defaultModel(provider) };
  } catch {
    return { provider: "openai", model: "gpt-4.1-mini" };
  }
}

export function setAiModelSettings(settings: AiModelSettings) {
  window.localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event("ai-model-settings-changed"));
}

export function defaultModel(provider: AiProvider) {
  if (provider === "openai") return "gpt-4.1-mini";
  return "";
}

function isAiProvider(value: unknown): value is AiProvider {
  return value === "openai" || value === "ollama" || value === "lmstudio";
}
