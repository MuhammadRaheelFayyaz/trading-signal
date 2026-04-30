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

    const { signalId, outcome } = await request.json()
    
    if (!['win', 'loss'].includes(outcome)) {
      return NextResponse.json({ error: 'Invalid outcome' }, { status: 400 })
    }

    const { error } = await supabase
      .from('signals')
      .update({ outcome })
      .eq('id', signalId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Update outcome error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}