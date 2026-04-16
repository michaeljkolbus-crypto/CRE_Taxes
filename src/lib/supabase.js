import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qkpfrjfiiuveuybpftep.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrcGZyamZpaXV2ZXV5YnBmdGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMzgyNTcsImV4cCI6MjA5MTkxNDI1N30.2sP7EovEj_eFr1-s2JpX5LG2g8PVHFO-3n84IKCvVVc'

// Use sessionStorage so sessions expire when the browser is closed,
// rather than persisting indefinitely across restarts.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: window.sessionStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
})