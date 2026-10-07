window.SUPABASE_URL = 'https://hrdwnlhrbzakpwpouapd.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_k2Wf1vD0cniDsWZcR_Y5NQ_VM-OlaSf';

if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY && window.supabase?.createClient) {
  window.supabaseClient = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
  );
}
