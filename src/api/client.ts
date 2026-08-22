import { API_URL } from '@/config/apiUrl';
import { copy } from '@/copy/uk';

export { API_URL };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  accessToken?: string | null;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(__DEV__ ? `${copy.apiUnreachable} ${API_URL}` : copy.apiUnreachable, 0);
  }

  const data = (await response.json().catch(() => ({}))) as {
    message?: string;
  } & T;

  if (!response.ok) {
    throw new ApiError(data.message ?? 'Request failed', response.status);
  }

  return data;
}

export async function apiUpload<T>(
  path: string,
  file: { uri: string; name: string; type: string },
  accessToken: string,
  fields: Record<string, string> = {},
  onProgress?: (percent: number) => void,
): Promise<T> {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value);
  }
  form.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as unknown as Blob);

  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}${path}`);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress && event.total > 0) {
        onProgress(Math.max(1, Math.min(99, Math.round((event.loaded / event.total) * 100))));
      }
    };
    xhr.onload = () => {
      let data: { message?: string } & T;
      try {
        data = JSON.parse(xhr.responseText || '{}') as { message?: string } & T;
      } catch {
        reject(new ApiError(copy.requestError, xhr.status));
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new ApiError(data.message ?? 'Request failed', xhr.status));
        return;
      }
      onProgress?.(100);
      resolve(data);
    };
    xhr.onerror = () => {
      reject(new ApiError(__DEV__ ? `${copy.apiUnreachable} ${API_URL}` : copy.apiUnreachable, 0));
    };
    xhr.send(form);
  });
}
