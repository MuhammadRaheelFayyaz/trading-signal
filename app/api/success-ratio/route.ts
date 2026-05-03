import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabaseServer'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const symbol = url.searchParams.get('symbol')
    
    const supabase = await createClient()

    let query = supabase
      .from('signals')
      .select('outcome, strategy, symbol')
      .not('outcome', 'is', null)

    if (symbol) {
      query = query.eq('symbol', symbol)
    }

    const { data: signals, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Group by strategy and symbol (symbol is constant if filtered, but still group)
    const statsMap = new Map<string, { wins: number; total: number }>()

    for (const signal of signals) {
      const key = `${signal.strategy}|${signal.symbol}`
      if (!statsMap.has(key)) statsMap.set(key, { wins: 0, total: 0 })
      const stats = statsMap.get(key)!
      stats.total++
      if (signal.outcome === 'win') stats.wins++
    }

    const data = Array.from(statsMap.entries()).map(([key, { wins, total }]) => {
      const [strategyKey, symbol] = key.split('|')
      return {
        strategy: strategyKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        symbol,
        wins,
        total,
        successRate: total > 0 ? (wins / total) * 100 : 0
      }
    })

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Success ratio error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}