import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { activateConfig, takeAirdropSnapshot, recalculateWallet, getActiveConfig } from '@/lib/points'

function checkAdmin(req: NextRequest): boolean {
  return req.headers.get('x-admin-key') === process.env.ADMIN_SECRET_KEY
}

// GET /api/admin/points — auth check + overview stats
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [walletCount, flaggedCount, topWallets, config] = await Promise.all([
    supabaseAdmin.from('wallet_points').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('wallet_points').select('*', { count: 'exact', head: true }).eq('is_flagged', true),
    supabaseAdmin.from('wallet_points').select('*').order('total_points', { ascending: false }).limit(100),
    getActiveConfig(),
  ])

  return NextResponse.json({
    total_wallets: walletCount.count,
    flagged_wallets: flaggedCount.count,
    top_wallets: topWallets.data,
    active_config: config,
  })
}
