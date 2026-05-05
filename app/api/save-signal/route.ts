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
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { symbol, timeframe, rrRatio, strategy, direction, entry, stopLoss, takeProfit, entryTime } = await request.json();
    // Ensure entryTime is a proper Date object
    const finalEntryTime = entryTime ? new Date(entryTime).toISOString() : new Date().toISOString();

    const { data, error } = await supabase
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
        entryTime: finalEntryTime, // full timestamp
        status: 'wait', 
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Save signal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}