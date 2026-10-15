// Set these to the Project URL and publishable/anon key from Supabase Project Settings > API.
// Then run supabase-setup.sql in the project's SQL Editor to enable shared profiles and chat.
window.SQUADUP_SUPABASE_CONFIG = {
  url:"https://oernbhewtzzrltljbyhb.supabase.co",
  anonKey: "sb_publishable_7gKvUfZT9KBnBPouxAI5ig_7IyzWlib"
};

window.squadUpSupabaseConfigError = "";
const hasSupabaseUrl = Boolean(window.SQUADUP_SUPABASE_CONFIG.url.trim());
const hasSupabaseKey = Boolean(window.SQUADUP_SUPABASE_CONFIG.anonKey.trim());

if (hasSupabaseUrl !== hasSupabaseKey) {
  window.squadUpSupabaseConfigError = "Set both the Supabase project URL and publishable/anon key in supabase-config.js.";
} else if (hasSupabaseUrl && !window.supabase) {
  window.squadUpSupabaseConfigError = "The Supabase client library did not load. Check your internet connection and reload.";
} else if (hasSupabaseUrl) {
  window.squadUpSupabase = window.supabase.createClient(
    window.SQUADUP_SUPABASE_CONFIG.url,
    window.SQUADUP_SUPABASE_CONFIG.anonKey
  );
}
