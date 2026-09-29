export function getAppConfig() {
  return {
    supabaseConfigured: Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY),
    appName: 'EduLink — Lecturer–Student Academic Management'
  };
}
