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
  return supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });
}

export async function signIn(email, password) {
  if (!supabase) return { error: { message: "Supabase not configured" } };
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  if (!supabase) return;
  return supabase.auth.signOut();
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
}

export function onAuthChange(callback) {
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
  return supabase.auth.onAuthStateChange((event, session) => callback(event, session));
}

// Data sync — saves all localStorage keys with "ff-" prefix to cloud
export async function backupToCloud(userId) {
  if (!supabase) return;
  const snapshot = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("ff-")) {
      snapshot[key] = localStorage.getItem(key);
    }
  }
  // Also save recent foods
  const recents = localStorage.getItem("ff_recent_foods");
  if (recents) snapshot["ff_recent_foods"] = recents;

  const controller = new AbortController();
  setTimeout(() => controller.abort(), 5000);
  return supabase.from("user_data").upsert(
    { user_id: userId, key: "backup", data: snapshot, updated_at: new Date().toISOString() },
    { onConflict: "user_id,key" }
  ).abortSignal(controller.signal);
}

// Store API credentials securely in Supabase (not localStorage)
export async function saveApiKeys(userId, keys) {
  if (!supabase) return;
  return supabase.from("user_data").upsert(
    { user_id: userId, key: "api_keys", data: keys, updated_at: new Date().toISOString() },
    { onConflict: "user_id,key" }
  );
}

export async function getApiKeys(userId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("user_data")
    .select("data")
    .eq("user_id", userId)
    .eq("key", "api_keys")
    .single();
  if (error || !data?.data) return null;
  return data.data;
}

export async function restoreFromCloud(userId) {
  if (!supabase) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const { data, error } = await supabase
      .from("user_data")
      .select("data")
      .eq("user_id", userId)
      .eq("key", "backup")
      .abortSignal(controller.signal)
      .single();

    clearTimeout(timer);
    if (error || !data?.data) return false;

    const snapshot = data.data;
    Object.entries(snapshot).forEach(([key, value]) => {
      if (typeof key === "string" && key.startsWith("ff") && typeof value === "string") {
        localStorage.setItem(key, value);
      }
    });
    return true;
  } catch (e) {
    clearTimeout(timer);
    console.warn("restoreFromCloud aborted or failed:", e);
    return false;
  }
}
