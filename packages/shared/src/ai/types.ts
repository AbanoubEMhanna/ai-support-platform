export type AiProvider = 'openai' | 'ollama' | 'lmstudio';

export type ChatTurn = { role: 'system' | 'user' | 'assistant'; content: string };
