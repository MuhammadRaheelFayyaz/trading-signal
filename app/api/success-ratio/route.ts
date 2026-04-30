import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabaseServer'

export async function GET(request: NextRequest) {
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

    const { data: signals, error } = await supabase
      .from('signals')
      .select('outcome')
      .eq('user_id', user.id)
      .not('outcome', 'is', null)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const total = signals.length
    const wins = signals.filter(s => s.outcome === 'win').length
    const ratio = total > 0 ? (wins / total) * 100 : 0

    return NextResponse.json({
      success_ratio: ratio,
      wins,
      losses: total - wins,
      total_signals: total
    })
    
  } catch (error) {
    console.error('Success ratio error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}