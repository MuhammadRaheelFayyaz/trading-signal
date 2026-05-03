import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get all users with payment_date and active status
    const { data: users, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 400 })
    }

    // Calculate overdue status for each user (payment older than 30 days)
    const now = new Date()
    const usersWithStatus = users.map(u => {
      const paymentDate = u.payment_date ? new Date(u.payment_date) : null
      const daysOverdue = paymentDate 
        ? Math.floor((now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24)) - 30
        : 999 // never paid -> always overdue
      const isOverdue = daysOverdue > 0
      return { ...u, is_overdue: isOverdue, days_overdue: daysOverdue > 0 ? daysOverdue : 0 }
    })

    return NextResponse.json({ users: usersWithStatus })
  } catch (error) {
    console.error('Admin get users error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}