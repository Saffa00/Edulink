export function getApiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL;
  if (configured && (configured.startsWith('https://') || configured.startsWith('http://'))) {
    return configured.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname || '';
    // If running in production on Vercel or any public domain, target the production Render backend
    if (hostname.includes('vercel.app') || (hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.startsWith('192.168.') && !hostname.startsWith('10.'))) {
      return 'https://edulink-backend-bjn6.onrender.com';
    }
    // In local development, use relative path '' so Vite dev proxy handles it
    return '';
  }
  return 'http://localhost:4000';
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
