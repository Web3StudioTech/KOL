import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data } = await supabaseAdmin
    .from('badge_counts')
    .select('badge, issued, max_supply')

  const counts: Record<string, number> = {}
  ;(data || []).forEach(row => { counts[row.badge] = row.issued })
  return NextResponse.json({ counts })
}
