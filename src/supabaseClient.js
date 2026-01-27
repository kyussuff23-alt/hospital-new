import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,       // keep the session in localStorage
    autoRefreshToken: true,     // refresh JWTs automatically before they expire
    detectSessionInUrl: true,   // handle OAuth redirects correctly
  },
});

// Debug logs to confirm env variables are loaded
console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Key:", supabaseAnonKey ? "Loaded" : "Missing");
