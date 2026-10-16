export function getApiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL;
  if (configured && (configured.startsWith('https://') || configured.startsWith('http://'))) {
    return configured.replace(/\/+$/, '');
  }
  return 'https://edulink-backend-bjn6.onrender.com';
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
