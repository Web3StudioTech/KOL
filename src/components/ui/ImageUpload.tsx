'use client'
import { useState, useRef } from 'react'

interface ImageUploadProps {
  type:        'token' | 'banner'
  wallet:      string
  value:       string
  onChange:    (url: string) => void
  label:       string
}

// Recommended sizes (DexScreener/DexTools compatible)
const SPECS = {
  token:  { w: 1000, h: 1000, ratio: '1:1 square',     desc: '1000×1000px recommended' },
  banner: { w: 1500, h: 500,  ratio: '3:1 horizontal', desc: '1500×500px recommended'  },
}

export default function ImageUpload({ type, wallet, value, onChange, label }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState('')
  const [preview, setPreview]     = useState(value || '')
  const inputRef = useRef<HTMLInputElement>(null)
  const spec = SPECS[type]

  async function handleFile(file: File) {
    setError('')
    setUploading(true)

    // Client-side preview
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    try {
      const formData = new FormData()
      formData.append('file',   file)
      formData.append('type',   type)
      formData.append('wallet', wallet || 'anonymous')

      const res  = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Upload failed')

      onChange(data.url)
      setPreview(data.url)
    } catch (err: any) {
      setError(err.message)
      setPreview(value || '')
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const isToken  = type === 'token'
  const boxH     = isToken ? '140px' : '100px'
  const aspectR  = isToken ? '1/1' : '3/1'

  return (
    <div style={{ marginBottom:'14px' }}>
      <label style={{ display:'block', fontFamily:'Barlow Condensed,sans-serif', fontSize:'11px', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', color:'var(--muted)', marginBottom:'6px' }}>
        {label}
      </label>

      {/* Upload zone */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        style={{
          width:           '100%',
          height:          boxH,
          border:          `2px dashed ${error ? 'rgba(255,61,107,0.5)' : preview ? 'rgba(0,229,255,0.3)' : 'var(--border)'}`,
          borderRadius:    '4px',
          background:      preview ? 'transparent' : 'var(--bg3)',
          cursor:          uploading ? 'wait' : 'pointer',
          position:        'relative',
          overflow:        'hidden',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          transition:      'border-color 0.2s',
        }}
        onMouseEnter={e => { if (!uploading) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,255,0.5)' }}
        onMouseLeave={e => { if (!uploading) (e.currentTarget as HTMLElement).style.borderColor = preview ? 'rgba(0,229,255,0.3)' : 'var(--border)' }}
      >
        {/* Preview image */}
        {preview && (
          <img
            src={preview}
            alt="Preview"
            style={{
              position:   'absolute',
              inset:      0,
              width:      '100%',
              height:     '100%',
              objectFit:  isToken ? 'contain' : 'cover',
              background: '#080b0f',
            }}
          />
        )}

        {/* Overlay on hover when has image */}
        {preview && !uploading && (
          <div style={{
            position:       'absolute',
            inset:          0,
            background:     'rgba(0,0,0,0.6)',
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            opacity:        0,
            transition:     'opacity 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0'}
          >
            <div style={{ fontSize:'20px', marginBottom:'4px' }}>📷</div>
            <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'12px', fontWeight:700, letterSpacing:'1px', color:'#fff' }}>Change Image</div>
          </div>
        )}

        {/* Upload prompt when no image */}
        {!preview && !uploading && (
          <div style={{ textAlign:'center', padding:'12px' }}>
            <div style={{ fontSize:'28px', marginBottom:'6px' }}>📁</div>
            <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'13px', fontWeight:700, letterSpacing:'1px', color:'var(--accent)', marginBottom:'4px' }}>
              Click or drag to upload
            </div>
            <div style={{ fontSize:'11px', color:'var(--muted)' }}>
              {spec.desc} · JPG, PNG, GIF, WEBP · Max 5MB
            </div>
          </div>
        )}

        {/* Uploading spinner */}
        {uploading && (
          <div style={{ textAlign:'center' }}>
            <div style={{ width:28, height:28, border:'3px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 8px' }} />
            <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'12px', fontWeight:700, letterSpacing:'1px', color:'var(--accent)' }}>
              Uploading...
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div style={{ marginTop:'6px', fontSize:'11px', color:'var(--accent2)', fontFamily:'Barlow Condensed,sans-serif', letterSpacing:'0.5px' }}>
          ❌ {error}
        </div>
      )}

      {/* Size spec reminder */}
      {!error && (
        <div style={{ marginTop:'5px', fontSize:'11px', color:'var(--muted)', fontFamily:'Barlow Condensed,sans-serif', letterSpacing:'0.5px' }}>
          {isToken
            ? '✓ Square image (1:1) — compatible with DexScreener, DexTools, CoinGecko'
            : '✓ Horizontal banner (3:1) — compatible with DexScreener project page'
          }
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        style={{ display:'none' }}
        onChange={handleChange}
      />
    </div>
  )
}
