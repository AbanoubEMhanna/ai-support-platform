export type OrganizationItem = {
  organization: {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
  };
  role: string;
  joinedAt: string;
};

export type DocumentItem = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: string;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TicketItem = {
  id: string;
  conversationId: string;
  status: string;
  priority: string;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  role: string;
  content: string;
  sources?: any;
  createdAt: string;
};

export type AiProvider = "openai" | "ollama" | "lmstudio";

export type AiModel = {
  id: string;
  name: string;
  provider: AiProvider;
  details?: string;
};
