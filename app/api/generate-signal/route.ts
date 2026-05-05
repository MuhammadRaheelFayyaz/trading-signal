import { NextRequest, NextResponse } from 'next/server'
import { demandSupplyStrategy } from '@/app/lib/strategies'

const TWELVEDATA_API_KEY = process.env.TWELVEDATA_API_KEY

export async function POST(request: NextRequest) {
  try {
    const { symbol, interval, rrRatio } = await request.json()
    if (!symbol || !interval || !rrRatio) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const intervalMap: Record<string, string> = {
      '1min': '1min', '5min': '5min', '15min': '15min',
      '1h': '1h', '4h': '4h', '1d': '1day'
    }
    const apiInterval = intervalMap[interval] || '1h'
    const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${apiInterval}&outputsize=200&apikey=${TWELVEDATA_API_KEY}`

    const response = await fetch(url)
    const data = await response.json()
    if (!data.values || data.values.length < 20) {
      return NextResponse.json({ error: 'Insufficient data' }, { status: 400 })
    }

    const candles = data.values.map((candle: any) => ({
      open: parseFloat(candle.open),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low),
      close: parseFloat(candle.close),
      timestamp: new Date(candle.datetime)
    })).reverse()

    const signal = demandSupplyStrategy(candles, rrRatio)
    const hasSignal = signal.entry > 0 && signal.stopLoss > 0 && signal.takeProfit > 0

    return NextResponse.json({
      success: true,
      hasSignal,
      signal: hasSignal ? {
        direction: signal.direction,
        entry: signal.entry,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
        explanation: signal.explanation,
        entryTime: signal.entryTime  // send as string
      } : null,
      currentPrice: candles[candles.length - 1].close,
      message: hasSignal ? null : signal.explanation
    });
  } catch (error) {
    console.error('Generate signal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}