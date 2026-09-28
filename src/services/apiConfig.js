export function getApiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL;
  if (typeof window !== 'undefined') {
    // If configured as an absolute HTTPS production URL, use it directly
    if (configured && configured.startsWith('https://')) {
      return configured.replace(/\/+$/, '');
    }
    // In local development or PWA running against Vite dev server,
    // use relative path '' so Vite dev proxy forwards /api to port 4000 seamlessly
    // regardless of whether accessed via localhost, 127.0.0.1, LAN IP, or mobile.
    return '';
  }
  return (configured || 'http://localhost:4000').replace(/\/+$/, '');
}

export function apiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBaseUrl();
  return base ? `${base}${cleanPath}` : cleanPath;
}

export async function safeApiFetch(endpoint, options = {}) {
  const url = apiUrl(endpoint);
  try {
    const res = await fetch(url, options);
    return res;
  } catch (netErr) {
    console.warn(`[API] Network error requesting ${url}:`, netErr.message);
    throw new Error(`Unable to reach backend server (${netErr.message || 'offline'}). Please check your connection.`);
  }
}
