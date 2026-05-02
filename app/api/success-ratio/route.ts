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

    // Fetch both outcome and strategy for each signal
    const { data: signals, error } = await supabase
      .from('signals')
      .select('outcome, strategy')
      .eq('user_id', user.id)
      .not('outcome', 'is', null)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Overall stats
    const total = signals.length
    const winsOverall = signals.filter(s => s.outcome === 'win').length
    const overallRatio = total > 0 ? (winsOverall / total) * 100 : 0

    // Per‑strategy stats
    const strategyMap = new Map<string, { wins: number; total: number }>()

    for (const signal of signals) {
      const strat = signal.strategy
      if (!strategyMap.has(strat)) {
        strategyMap.set(strat, { wins: 0, total: 0 })
      }
      const stats = strategyMap.get(strat)!
      stats.total++
      if (signal.outcome === 'win') stats.wins++
    }

    const perStrategy = Array.from(strategyMap.entries()).map(([key, { wins, total }]) => ({
      strategy: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // Format name
      strategyKey: key,
      wins,
      total,
      successRate: total > 0 ? (wins / total) * 100 : 0
    }))

    return NextResponse.json({
      overall: {
        success_ratio: overallRatio,
        wins: winsOverall,
        losses: total - winsOverall,
        total_signals: total
      },
      per_strategy: perStrategy
    })

  } catch (error) {
    console.error('Success ratio error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}