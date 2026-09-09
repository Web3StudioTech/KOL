import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Image size requirements (matching DexScreener/DexTools/pump.fun)
const TOKEN_IMAGE_MAX_KB  = 5120  // 5MB
const BANNER_IMAGE_MAX_KB = 5120  // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']

export async function POST(req: NextRequest) {
  try {
    const formData  = await req.formData()
    const file      = formData.get('file') as File
    const type      = formData.get('type') as string // 'token' or 'banner'
    const wallet    = formData.get('wallet') as string

    if (!file)   return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!type)   return NextResponse.json({ error: 'No type provided' }, { status: 400 })
    if (!wallet) return NextResponse.json({ error: 'No wallet provided' }, { status: 400 })

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({
        error: 'Invalid file type. Use JPG, PNG, GIF or WEBP.'
      }, { status: 400 })
    }

    // Validate file size
    const maxKB = type === 'token' ? TOKEN_IMAGE_MAX_KB : BANNER_IMAGE_MAX_KB
    if (file.size > maxKB * 1024) {
      return NextResponse.json({
        error: `File too large. Max ${maxKB / 1024}MB.`
      }, { status: 400 })
    }

    // Generate unique filename
    const ext      = file.name.split('.').pop() || 'png'
    const filename = `${wallet.toLowerCase()}_${type}_${Date.now()}.${ext}`
    const path     = `tokens/${filename}`

    // Upload to Supabase Storage
    const bytes  = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const { data, error } = await supabaseAdmin
      .storage
      .from('token-images')
      .upload(path, buffer, {
        contentType: file.type,
        upsert:      true,
      })

    if (error) {
      console.error('Supabase upload error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin
      .storage
      .from('token-images')
      .getPublicUrl(path)

    return NextResponse.json({
      success: true,
      url:     urlData.publicUrl,
      path,
    })

  } catch (err: any) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}
