import { DEFAULT_API_BASE_URL } from '../config/api';
import type {
  CreateTaskRequest,
  TaskItem,
  UpdateTaskRequest,
} from '../types/tasks';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
};

function normalizeBaseUrl(baseUrl?: string) {
  return (baseUrl ?? DEFAULT_API_BASE_URL).trim().replace(/\/+$/, '');
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
  baseUrl?: string
): Promise<T> {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  const data = text ? tryParseJson(text) : null;

  if (!response.ok) {
    throw new Error(extractErrorMessage(data, response.status, response.statusText));
  }

  return data as T;
}

function tryParseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractErrorMessage(
  payload: unknown,
  status: number,
  statusText: string
) {
  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    const errorPayload = payload as {
      title?: string;
      detail?: string;
      errors?: Record<string, string[]>;
    };

    if (errorPayload.title && errorPayload.detail) {
      return `${errorPayload.title}: ${errorPayload.detail}`;
    }

    if (errorPayload.title) {
      return errorPayload.title;
    }

    if (errorPayload.errors) {
      const joined = Object.entries(errorPayload.errors)
        .flatMap(([field, messages]) => messages.map((message) => `${field}: ${message}`))
        .join('\n');

      if (joined) {
        return joined;
      }
    }
  }

  return `${status} ${statusText}`;
}

export async function checkHealth(baseUrl?: string) {
  return request<{ status?: string }>('/health', {}, baseUrl);
}

export async function getTasks(baseUrl?: string) {
  return request<TaskItem[]>('/api/tasks', {}, baseUrl);
}

export async function createTask(
  payload: CreateTaskRequest,
  baseUrl?: string
) {
  return request<TaskItem>(
    '/api/tasks',
    {
      method: 'POST',
      body: payload,
    },
    baseUrl
  );
}

export async function updateTask(
  id: string,
  payload: UpdateTaskRequest,
  baseUrl?: string
) {
  return request<TaskItem>(
    `/api/tasks/${id}`,
    {
      method: 'PUT',
      body: payload,
    },
    baseUrl
  );
}

export async function deleteTask(id: string, baseUrl?: string) {
  await request<null>(
    `/api/tasks/${id}`,
    {
      method: 'DELETE',
    },
    baseUrl
  );
}
