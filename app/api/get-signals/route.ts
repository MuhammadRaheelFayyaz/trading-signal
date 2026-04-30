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
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const now = new Date()
    const signalsWithValidity = signals.map(signal => ({
      ...signal,
      is_valid: new Date(signal.expires_at) > now,
      is_expired: new Date(signal.expires_at) <= now
    }))

    return NextResponse.json({ signals: signalsWithValidity })
    
  } catch (error) {
    console.error('Get signals error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}