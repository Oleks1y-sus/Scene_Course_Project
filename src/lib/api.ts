import type { PageMeta } from './types';

const API_BASE = '/api/v1';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;
  readonly requestId?: string;

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string>,
    requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.requestId = requestId;
  }
}

interface ApiResponse<T> {
  data: T;
  meta?: PageMeta;
  error?: {
    code: string;
    message: string;
    fields?: Record<string, string>;
    requestId?: string;
  };
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const { body, headers, ...rest } = options;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      credentials: 'same-origin',
      cache: 'no-store',
      ...rest,
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(body !== undefined && !isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Немає зв’язку з сервером. Перевірте інтернет і спробуйте ще раз.');
  }

  if (response.status === 204) {
    return { data: undefined as T };
  }

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    // Only an expired/invalid session should log the SPA out. A wrong password
    // on the profile page is also a 401, but it must not destroy the session.
    if (
      response.status === 401 &&
      payload?.error?.code === 'UNAUTHORIZED' &&
      typeof window !== 'undefined'
    ) {
      window.dispatchEvent(new Event('scene:unauthorized'));
    }
    throw new ApiError(
      response.status,
      payload?.error?.code ?? 'REQUEST_FAILED',
      payload?.error?.message ?? 'Не вдалося виконати запит. Спробуйте пізніше.',
      payload?.error?.fields,
      payload?.error?.requestId,
    );
  }

  return payload ?? { data: undefined as T };
}

export const apiGet = async <T>(path: string): Promise<T> => (await apiRequest<T>(path)).data;

export const apiGetPage = async <T>(path: string): Promise<{ data: T[]; meta: PageMeta }> => {
  const response = await apiRequest<T[]>(path);
  return {
    data: response.data,
    meta: response.meta ?? { page: 1, limit: response.data.length, total: response.data.length, totalPages: 1 },
  };
};

export const apiPost = async <T>(path: string, body?: unknown): Promise<T> =>
  (await apiRequest<T>(path, { method: 'POST', body })).data;

export const apiPatch = async <T>(path: string, body?: unknown): Promise<T> =>
  (await apiRequest<T>(path, { method: 'PATCH', body })).data;

export const apiDelete = async <T = undefined>(path: string, body?: unknown): Promise<T> =>
  (await apiRequest<T>(path, { method: 'DELETE', body })).data;

export const buildQuery = (params: Record<string, string | number | boolean | undefined | null>): string => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    query.set(key, String(value));
  }
  const result = query.toString();
  return result ? `?${result}` : '';
};

export const errorMessage = (error: unknown): string => {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Сталася помилка. Спробуйте ще раз.';
};

export const fieldError = (error: unknown, field: string): string | undefined => {
  if (error instanceof ApiError) return error.fields?.[field];
  return undefined;
};
