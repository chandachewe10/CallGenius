export function getOpenAiApiKey(): string {
  return process.env.EXPO_PUBLIC_OPENAI_API_KEY?.trim() ?? '';
}

export function hasOpenAiApiKey(): boolean {
  return getOpenAiApiKey().length > 0;
}

export function getLencoApiBaseUrl(): string {
  const url =
    process.env.EXPO_PUBLIC_LENCO_API_BASE_URL?.trim() ??
    'https://api.lenco.co/access/v2';
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export function getLencoSecretKey(): string {
  return process.env.EXPO_PUBLIC_LENCO_SECRET_KEY?.trim() ?? '';
}

export function hasLencoSecretKey(): boolean {
  return getLencoSecretKey().length > 0;
}

export function getSupabaseUrl(): string {
  return process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
}

export function getSupabaseAnonKey(): string {
  return process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
}

export function hasSupabaseConfig(): boolean {
  return getSupabaseUrl().length > 0 && getSupabaseAnonKey().length > 0;
}
