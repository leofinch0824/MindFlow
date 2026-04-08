const API_BASE = '/api';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

// Types
export interface NewsSource {
  id: number;
  name: string;
  source_type: string;
  api_base_url: string;
  auth_key: string;
  config: Record<string, any>;
  created_at: string | null;
  updated_at: string | null;
  last_fetch_at: string | null;
  article_count: number;
}

export interface Article {
  id: number;
  source_id: number;
  external_id: string;
  title: string;
  link: string;
  content: string;
  summary: string;
  author: string;
  published_at: string | null;
  fetched_at: string;
  source_name: string | null;
}

export interface ArticleListResponse {
  items: Article[];
  total: number;
  limit: number;
  offset: number;
}

export interface AIConfig {
  provider: string;
  base_url: string;
  model: string;
  updated_at: string | null;
}

// Sources API
export const sourcesApi = {
  list: () => fetchApi<NewsSource[]>('/sources'),

  get: (id: number) => fetchApi<NewsSource>(`/sources/${id}`),

  create: (data: Omit<NewsSource, 'id' | 'created_at' | 'updated_at' | 'last_fetch_at' | 'article_count'>) =>
    fetchApi<NewsSource>('/sources', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<NewsSource>) =>
    fetchApi<NewsSource>(`/sources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchApi<{ success: boolean; message: string }>(`/sources/${id}`, {
      method: 'DELETE',
    }),

  fetch: (id: number) =>
    fetchApi<{ success: boolean; message: string; articles_added: number }>(`/sources/${id}/fetch`, {
      method: 'POST',
    }),
};

// Articles API
export const articlesApi = {
  list: (params?: { source_id?: number; limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.source_id) searchParams.set('source_id', String(params.source_id));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    const query = searchParams.toString();
    return fetchApi<ArticleListResponse>(`/articles${query ? `?${query}` : ''}`);
  },

  get: (id: number) => fetchApi<Article>(`/articles/${id}`),

  summarize: (id: number) =>
    fetchApi<{ success: boolean; summary: string }>(`/articles/${id}/summarize`, {
      method: 'POST',
    }),
};

// Config API
export const configApi = {
  getAI: () => fetchApi<AIConfig>('/config/ai'),

  updateAI: (data: Omit<AIConfig, 'updated_at'>) =>
    fetchApi('/config/ai', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  testAI: () => fetchApi<{ success: boolean; message: string }>('/config/ai/test', { method: 'POST' }),

  getSchedule: () => fetchApi<{ jobs: Array<{ id: string; name: string; next_run: string | null }> }>('/config/schedule'),

  updateSchedule: (hours: number[]) =>
    fetchApi('/config/schedule', {
      method: 'PUT',
      body: JSON.stringify(hours),
    }),
};
