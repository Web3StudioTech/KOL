import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { activateConfig, recalculateAllWallets, getActiveConfig } from '@/lib/points'

function checkAdmin(req: NextRequest): boolean {
  return req.headers.get('x-admin-key') === process.env.ADMIN_SECRET_KEY
}

// GET — list all config versions
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: configs } = await supabaseAdmin
    .from('points_config')
    .select('*')
    .order('version', { ascending: false })

  return NextResponse.json({ configs: configs || [] })
}

// POST — save a new config version
export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Validate weights sum to 100
  const weightSum = (body.volume_weight || 0) + (body.social_weight || 0) +
                    (body.age_weight || 0) + (body.active_weight || 0)
  if (Math.abs(weightSum - 100) > 0.01) {
    return NextResponse.json(
      { error: `Weights must sum to 100. Current: ${weightSum}` },
      { status: 400 }
    )
  }

  // Get next version number
  const { data: latest } = await supabaseAdmin
    .from('points_config')
    .select('version')
    .order('version', { ascending: false })
    .limit(1)
    .single()

  const nextVersion = (latest?.version || 0) + 1

  const { data, error } = await supabaseAdmin
    .from('points_config')
    .insert({
      ...body,
      version: nextVersion,
      is_active: false,
      created_by: 'admin',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, config: data })
}

// POST /activate — activate a version
export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { version } = await req.json()
  if (!version) return NextResponse.json({ error: 'version required' }, { status: 400 })

  try {
    await activateConfig(version, 'admin')
    return NextResponse.json({ success: true, message: `Version ${version} activated. Recalculating...` })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
