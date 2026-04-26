export type AiProvider = 'openai' | 'ollama' | 'lmstudio';

export type AiModel = {
  id: string;
  name: string;
  provider: AiProvider;
  details?: string;
};
