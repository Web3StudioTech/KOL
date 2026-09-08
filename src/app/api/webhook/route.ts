import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ethers } from 'ethers'
import { BONDING_CURVE_ABI } from '@/lib/contracts'

// Verify webhook signature from Alchemy
function verifyAlchemySignature(body: string, signature: string): boolean {
  const secret = process.env.ALCHEMY_WEBHOOK_SECRET
  if (!secret) return true // skip verification in dev
  try {
    const crypto = require('crypto')
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(body)
    const expected = hmac.digest('hex')
    return signature === expected
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const body      = await req.text()
    const signature = req.headers.get('x-alchemy-signature') || ''

    if (!verifyAlchemySignature(body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = JSON.parse(body)
    const iface   = new ethers.Interface(BONDING_CURVE_ABI)

    // Process each log in the webhook payload
    const logs = payload?.event?.data?.block?.logs || []

    for (const log of logs) {
      try {
        const parsed = iface.parseLog({
          topics: log.topics,
          data:   log.data,
        })

        if (!parsed) continue

        switch (parsed.name) {

          // ── New token launched ────────────────────────────
          case 'TokenLaunched': {
            const { token, creator, name, ticker } = parsed.args
            await supabaseAdmin.from('tokens').upsert({
              contract_address: token.toLowerCase(),
              creator_wallet:   creator.toLowerCase(),
              name,
              ticker,
              status:           'bonding',
              market_cap_usd:   0,
              price_eth:        0,
              volume_24h_usd:   0,
              volume_total_usd: 0,
              holder_count:     1,
              bonding_pct:      0,
              kol_call_count:   0,
              created_at:       new Date().toISOString(),
            }, { onConflict: 'contract_address' })

            console.log(`[Webhook] Token launched: $${ticker} at ${token}`)
            break
          }

          // ── Token bought ──────────────────────────────────
          case 'TokensBought': {
            const { token, buyer, ethIn, tokensOut, newPrice } = parsed.args
            const ethInNum   = parseFloat(ethers.formatEther(ethIn))
            const newPriceNum = parseFloat(ethers.formatUnits(newPrice, 18))

            // Get ETH price for USD calculation
            const ethPriceRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/price`)
            const { price: ethPrice } = await ethPriceRes.json()
            const volumeUsd = ethInNum * ethPrice

            // Update token stats
            await supabaseAdmin.rpc('update_token_on_trade', {
              p_contract_address: token.toLowerCase(),
              p_price_eth:        newPriceNum,
              p_volume_usd:       volumeUsd,
              p_buyer:            buyer.toLowerCase(),
            })

            // Track trader volume for badge
            await updateTraderVolume(buyer.toLowerCase(), volumeUsd)

            console.log(`[Webhook] Buy: ${ethInNum} ETH → ${token.slice(0,8)} by ${buyer.slice(0,8)}`)
            break
          }

          // ── Token sold ────────────────────────────────────
          case 'TokensSold': {
            const { token, seller, tokensIn, ethOut, newPrice } = parsed.args
            const ethOutNum  = parseFloat(ethers.formatEther(ethOut))
            const newPriceNum = parseFloat(ethers.formatUnits(newPrice, 18))

            const ethPriceRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/price`)
            const { price: ethPrice } = await ethPriceRes.json()
            const volumeUsd = ethOutNum * ethPrice

            await supabaseAdmin.rpc('update_token_on_trade', {
              p_contract_address: token.toLowerCase(),
              p_price_eth:        newPriceNum,
              p_volume_usd:       volumeUsd,
              p_buyer:            seller.toLowerCase(),
            })

            await updateTraderVolume(seller.toLowerCase(), volumeUsd)

            console.log(`[Webhook] Sell: ${ethOutNum} ETH ← $${token.slice(0,8)} by ${seller.slice(0,8)}`)
            break
          }

          // ── Token graduated ───────────────────────────────
          case 'TokenGraduated': {
            const { token, totalEth, totalVolumeUsd } = parsed.args

            await supabaseAdmin
              .from('tokens')
              .update({
                status:           'graduated',
                bonding_pct:      100,
                graduated_at:     new Date().toISOString(),
                total_eth_raised: parseFloat(ethers.formatEther(totalEth)),
              })
              .eq('contract_address', token.toLowerCase())

            console.log(`[Webhook] 🎓 Token graduated: ${token}`)
            break
          }

          // ── Rug detected ──────────────────────────────────
          case 'RugDetected': {
            const { token, creator, trigger } = parsed.args

            await supabaseAdmin
              .from('tokens')
              .update({
                is_rug_flagged: true,
                rug_trigger:    trigger,
                rug_detected_at: new Date().toISOString(),
              })
              .eq('contract_address', token.toLowerCase())

            // Open community vote
            await supabaseAdmin.from('community_votes').insert({
              token_contract: token.toLowerCase(),
              rug_trigger:    trigger,
              status:         'active',
              opened_at:      new Date().toISOString(),
              expires_at:     new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
            })

            console.log(`[Webhook] ⚠️ Rug detected: ${token} — ${trigger}`)
            break
          }

          // ── KOL Pass earned ───────────────────────────────
          case 'KolPassEarned': {
            const { token, creator, passNumber, totalVolumeUsd } = parsed.args

            await supabaseAdmin
              .from('tokens')
              .update({
                kol_pass_earned: true,
                kol_pass_number: Number(passNumber),
              })
              .eq('contract_address', token.toLowerCase())

            console.log(`[Webhook] 🎫 KOL Pass #${passNumber} earned by ${token}`)
            break
          }

          // ── Trader badge earned ───────────────────────────
          case 'TraderBadgeEarned': {
            const { trader, totalVolumeUsd } = parsed.args

            await supabaseAdmin
              .from('launchers')
              .update({ badge: 'trader' })
              .eq('wallet_address', trader.toLowerCase())

            console.log(`[Webhook] 💎 Trader badge: ${trader}`)
            break
          }

          // ── KOL Call submitted ────────────────────────────
          case 'KolCallSubmitted': {
            const { callId, kol, token, priceAtCall, thesis, badgeTier } = parsed.args

            // Get launcher id
            const { data: launcher } = await supabaseAdmin
              .from('launchers')
              .select('id')
              .eq('wallet_address', kol.toLowerCase())
              .single()

            const { data: tokenData } = await supabaseAdmin
              .from('tokens')
              .select('id')
              .eq('contract_address', token.toLowerCase())
              .single()

            if (launcher && tokenData) {
              await supabaseAdmin.from('kol_calls').upsert({
                onchain_call_id:  callId,
                launcher_id:      launcher.id,
                token_id:         tokenData.id,
                thesis,
                price_at_call:    parseFloat(ethers.formatUnits(priceAtCall, 18)),
                mktcap_at_call:   0,
                accuracy_status:  'pending',
                called_at:        new Date().toISOString(),
                resolve_at:       new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              }, { onConflict: 'onchain_call_id' })

              // Increment KOL call count on token
              await supabaseAdmin.rpc('increment_kol_calls', {
                p_token_id: tokenData.id
              })
            }

            console.log(`[Webhook] 📢 KOL call: ${kol.slice(0,8)} called ${token.slice(0,8)}`)
            break
          }
        }
      } catch (parseErr) {
        // Log unknown or non-matching events
        continue
      }
    }

    return NextResponse.json({ ok: true, processed: logs.length })

  } catch (err: any) {
    console.error('[Webhook] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── Helper: update trader volume and assign badge ─────────────
async function updateTraderVolume(wallet: string, volumeUsd: number) {
  // Upsert launcher record
  await supabaseAdmin.rpc('update_trader_volume', {
    p_wallet:     wallet,
    p_volume_usd: volumeUsd,
  })
}
