import { createClient } from '@supabase/supabase-js'
const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Next.js patches the global fetch() and caches it by default — including
// calls made internally by libraries like this one, not just ones written
// directly in route code. Without this, admin/API reads can silently show
// stale data even moments after a write actually succeeded.
const noStoreFetch = (input: RequestInfo | URL, init?: RequestInit) =>
  fetch(input, { ...init, cache: 'no-store' })

export const supabase      = createClient(url, anon, { auth: { persistSession: false }, global: { fetch: noStoreFetch } })
export const supabaseAdmin = createClient(url, svc,  { auth: { persistSession: false }, global: { fetch: noStoreFetch } })
