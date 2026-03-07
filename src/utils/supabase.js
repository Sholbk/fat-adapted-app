import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export const isSupabaseConfigured = () => !!supabase;

// Auth helpers
export async function signUp(email, password) {
  if (!supabase) return { error: { message: "Supabase not configured" } };
  return supabase.auth.signUp({ email, password });
}

export async function signIn(email, password) {
  if (!supabase) return { error: { message: "Supabase not configured" } };
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  if (!supabase) return;
  return supabase.auth.signOut();
}

export async function getUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

// Data sync helpers
export async function syncToCloud(userId, key, data) {
  if (!supabase) return;
  return supabase.from("user_data").upsert(
    { user_id: userId, key, data, updated_at: new Date().toISOString() },
    { onConflict: "user_id,key" }
  );
}

export async function syncFromCloud(userId, key) {
  if (!supabase) return null;
  const { data } = await supabase
    .from("user_data")
    .select("data")
    .eq("user_id", userId)
    .eq("key", key)
    .single();
  return data?.data || null;
}
