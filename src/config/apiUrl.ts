import Constants from 'expo-constants';

const DEFAULT_API_PORT = 3001;
const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);

function isLoopbackHost(host: string): boolean {
  return LOOPBACK.has(host);
}

function hostnameFromCandidate(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }
  try {
    const withProtocol = raw.includes('://') ? raw : `http://${raw}`;
    const hostname = new URL(withProtocol).hostname;
    if (hostname && !isLoopbackHost(hostname)) {
      return hostname;
    }
  } catch {
    const hostname = raw.split('/')[0]?.split(':')[0];
    if (hostname && !isLoopbackHost(hostname)) {
      return hostname;
    }
  }
  return null;
}

function lanHostFromExpo(): string | null {
  return (
    hostnameFromCandidate(Constants.expoConfig?.hostUri) ??
    hostnameFromCandidate(Constants.expoGoConfig?.debuggerHost) ??
    hostnameFromCandidate(Constants.linkingUri)
  );
}

export function resolveApiUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
  if (explicit) {
    try {
      const parsed = new URL(explicit);
      if (__DEV__ && isLoopbackHost(parsed.hostname)) {
        const lanHost = lanHostFromExpo();
        if (lanHost) {
          const port = parsed.port || String(DEFAULT_API_PORT);
          return `${parsed.protocol}//${lanHost}:${port}`;
        }
      }
      return explicit;
    } catch {
      return explicit;
    }
  }

  if (__DEV__) {
    const lanHost = lanHostFromExpo();
    if (lanHost) {
      return `http://${lanHost}:${DEFAULT_API_PORT}`;
    }
  }

  return `http://127.0.0.1:${DEFAULT_API_PORT}`;
}

export const API_URL = resolveApiUrl();
