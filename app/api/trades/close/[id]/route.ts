import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabaseServer'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('Closing trade ID:', id) // debug

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

    const { exit_price, exit_date } = await request.json()
    if (!exit_price || !exit_date) {
      return NextResponse.json({ error: 'Exit price and date required' }, { status: 400 })
    }

    // First, get the trade to ensure it exists and is active
    const { data: trade, error: fetchError } = await supabase
      .from('trades')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !trade) {
      console.error('Trade fetch error:', fetchError)
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    if (trade.status !== 'active') {
      return NextResponse.json({ error: 'Trade is already closed' }, { status: 400 })
    }

    // Calculate PnL
    const exitPriceNum = parseFloat(exit_price)
    let pnl = 0
    let pnl_percent = 0

    if (trade.type === 'long') {
      pnl = (exitPriceNum - trade.entry_price) * trade.quantity
      pnl_percent = ((exitPriceNum - trade.entry_price) / trade.entry_price) * 100
    } else {
      pnl = (trade.entry_price - exitPriceNum) * trade.quantity
      pnl_percent = ((trade.entry_price - exitPriceNum) / trade.entry_price) * 100
    }

    const { error: updateError } = await supabase
      .from('trades')
      .update({
        exit_price: exitPriceNum,
        exit_date: new Date(exit_date).toISOString(),
        pnl,
        pnl_percent,
        status: 'closed'
      })
      .eq('id', id)

    if (updateError) throw updateError

    return NextResponse.json({ success: true, pnl, pnl_percent })
  } catch (error) {
    console.error('Close trade error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}