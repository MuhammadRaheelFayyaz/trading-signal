import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabaseServer'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    // Use the token to authenticate this request
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      console.error('Auth error:', error)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { symbol, timeframe, rrRatio, strategy, direction, entry, stopLoss, takeProfit } = body

    const expiresInHours: Record<string, number> = {
      '1min': 2/60, '5min': 10/60, '15min': 0.5, '1h': 2, '4h': 8, '1d': 48
    }
    const hoursToExpire = expiresInHours[timeframe] || 2
    const expiresAt = new Date(Date.now() + hoursToExpire * 60 * 60 * 1000)

    const { data: signal, error: insertError } = await supabase
      .from('signals')
      .insert({
        user_id: user.id,
        symbol,
        timeframe,
        rr_ratio: rrRatio,
        strategy,
        direction,
        entry_price: entry,
        stop_loss: stopLoss,
        take_profit: takeProfit,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }
    return NextResponse.json({ success: true, signal })
  } catch (error) {
    console.error('Save signal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}