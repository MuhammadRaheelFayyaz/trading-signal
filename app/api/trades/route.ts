import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabaseServer'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.split(' ')[1]
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'active' or 'closed'
    let query = supabase.from('trades').select('*').eq('user_id', user.id).order('entry_date', { ascending: false })
    if (status) query = query.eq('status', status)
    const { data: trades, error } = await query
    if (error) throw error
    return NextResponse.json({ trades })
  } catch (error) {
    console.error('GET trades error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.split(' ')[1]
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { symbol, type, entry_price, quantity, entry_date, notes } = await request.json()
    const { data: trade, error } = await supabase
      .from('trades')
      .insert({
        user_id: user.id,
        symbol, type, entry_price, quantity, entry_date: new Date(entry_date).toISOString(),
        notes, status: 'active', exit_price: null, exit_date: null, pnl: 0, pnl_percent: 0
      })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ success: true, trade })
  } catch (error) {
    console.error('POST trade error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.split(' ')[1]
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    const { error } = await supabase.from('trades').delete().eq('id', id).eq('user_id', user.id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE trade error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}