import { NextRequest, NextResponse } from 'next/server'
import { generateSignal } from '@/app/lib/strategies'

const TWELVEDATA_API_KEY = process.env.TWELVEDATA_API_KEY

interface TwelveDataResponse {
  values: Array<{
    datetime: string
    open: string
    high: string
    low: string
    close: string
  }>
}

export async function POST(request: NextRequest) {
  try {
    const { symbol, interval, strategy, rrRatio } = await request.json()
    
    if (!symbol || !interval || !strategy || !rrRatio) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    const intervalMap: Record<string, string> = {
      '1min': '1min',
      '5min': '5min',
      '15min': '15min',
      '1h': '1h',
      '4h': '4h',
      '1d': '1day'
    }
    const apiInterval = intervalMap[interval] || '1h'
    
    const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${apiInterval}&outputsize=50&apikey=${TWELVEDATA_API_KEY}`
    const response = await fetch(url)
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 })
    }
    
    const data: TwelveDataResponse = await response.json()
    
    if (!data.values || data.values.length < 30) {
      return NextResponse.json({ error: 'Insufficient data for analysis' }, { status: 400 })
    }
    
    const candles = data.values.map(candle => ({
      open: parseFloat(candle.open),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low),
      close: parseFloat(candle.close),
      timestamp: new Date(candle.datetime)
    })).reverse()
    
    const signal = generateSignal(strategy, candles, rrRatio)
    
    return NextResponse.json({
      success: true,
      signal: {
        direction: signal.direction,
        entry: signal.entry,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
        explanation: signal.explanation
      },
      currentPrice: candles[candles.length - 1].close
    })
    
  } catch (error) {
    console.error('Signal generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}