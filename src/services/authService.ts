import { getSupabase } from '../lib/supabase';
import { hasSupabaseConfig } from '../config/env';

class AuthService {
  private adminFlag: boolean | null = null;

  isConfigured(): boolean {
    return hasSupabaseConfig();
  }

  async ensureSession(): Promise<string | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user?.id) {
      return sessionData.session.user.id;
    }

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.warn('[AuthService] Anonymous sign-in failed:', error.message);
      return null;
    }

    return data.user?.id ?? null;
  }

  async getUserId(): Promise<string | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  }

  async signInAdmin(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
    const supabase = getSupabase();
    if (!supabase) {
      return { ok: false, error: 'Supabase is not configured.' };
    }

    this.adminFlag = null;

    // Clear anonymous session so the admin JWT is used for the profile check.
    await supabase.auth.signOut();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      await this.ensureSession();
      return { ok: false, error: error.message };
    }

    const userId = data.user?.id;
    if (!userId) {
      await this.ensureSession();
      return { ok: false, error: 'Sign-in succeeded but no user ID was returned.' };
    }

    if (data.session) {
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    }

    const sessionReady = await this.waitForSessionUser(userId);
    if (!sessionReady) {
      await supabase.auth.signOut();
      await this.ensureSession();
      return {
        ok: false,
        error: 'Signed in but the session did not activate. Close the app fully and try again.',
      };
    }

    await supabase.rpc('ensure_user_profile');

    const isAdmin = await this.fetchIsAdmin(userId);
    if (!isAdmin) {
      await supabase.auth.signOut();
      this.adminFlag = false;
      await this.ensureSession();
      return {
        ok: false,
        error:
          'This account is not an admin. Your Supabase profile may be missing is_admin = true.',
      };
    }

    this.adminFlag = true;
    return { ok: true };
  }

  async signOutAdmin(): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) return;

    await supabase.auth.signOut();
    this.adminFlag = null;
    await this.ensureSession();
  }

  async isSupabaseAdmin(): Promise<boolean> {
    if (this.adminFlag === true) return true;

    const userId = await this.getUserId();
    if (!userId) return false;

    const isAdmin = await this.fetchIsAdmin(userId);
    if (isAdmin) {
      this.adminFlag = true;
    }
    return isAdmin;
  }

  private async waitForSessionUser(expectedUserId: string): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user?.id === expectedUserId) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return false;
  }

  private async fetchIsAdmin(userId?: string): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    const resolvedUserId = userId ?? (await this.getUserId());
    if (!resolvedUserId) return false;

    const { data: rpcData, error: rpcError } = await supabase.rpc('is_current_user_admin');
    if (!rpcError && rpcData === true) {
      return true;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', resolvedUserId)
      .maybeSingle();

    if (error) {
      console.warn('[AuthService] Profile admin check failed:', error.message);
      return false;
    }

    if (!profile) {
      console.warn('[AuthService] No profile row for user', resolvedUserId);
      return false;
    }

    return profile.is_admin === true;
  }
}

export const authService = new AuthService();
