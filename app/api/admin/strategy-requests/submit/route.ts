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

    const { strategyName, description } = await request.json()
    if (!strategyName || !description) {
      return NextResponse.json({ error: 'Strategy name and description required' }, { status: 400 })
    }

    const { data, error: insertError } = await supabase
      .from('strategy_requests')
      .insert({
        user_id: user.id,
        user_email: user.email,
        strategy_name: strategyName,
        description,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, request: data })
  } catch (error) {
    console.error('Submit strategy request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}